"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
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
exports.VenueAPI = void 0;
const firebase_functions_1 = require("firebase-functions");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Start writing functions
// https://firebase.google.com/docs/functions/typescript
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
admin.initializeApp();
const db = admin.firestore();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
app.get("/venues", async (req, res) => {
    try {
        const snap = await db.collection("Venues").get();
        const venues = snap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return res.json(venues);
    }
    catch (e) {
        if (e instanceof Error) {
            return res.status(500).json({ error: e.message });
        }
        else {
            return res.status(500).json({ error: "Unknown error" });
        }
    }
});
app.post("/venues", async (req, res) => {
    try {
        const venue = req.body;
        if (!venue.venuename || !venue.address || !venue.capacity ||
            !venue.companyID || !venue.description || !venue.email ||
            !venue.phonenumber || !venue.price) {
            return res.status(400).json({
                error: "some fields are missing",
            });
        }
        const ref = await db.collection("Venues").add(venue);
        return res.status(201).json({ id: ref.id });
    }
    catch (e) {
        if (e instanceof Error) {
            return res.status(500).json({ error: e.message });
        }
        else {
            return res.status(500).json({ error: "Unknown error" });
        }
    }
});
app.get("/venues/:id", async (req, res) => {
    try {
        const doc = await db.collection("Venues").doc(req.params["id"]).get();
        if (!doc.exists)
            return res.status(404).json({ error: "Not found" });
        return res.json(Object.assign({ id: doc.id }, doc.data()));
    }
    catch (e) {
        if (e instanceof Error) {
            return res.status(500).json({ error: e.message });
        }
        else {
            return res.status(500).json({ error: "Unknown error" });
        }
    }
});
app.put("/venues/:id", async (req, res) => {
    try {
        const venue = req.body;
        await db.collection("Venues").doc(req.params["id"]).update(venue);
        return res.json({ ok: true });
    }
    catch (e) {
        if (e instanceof Error) {
            return res.status(500).json({ error: e.message });
        }
        else {
            return res.status(500).json({ error: "Unknown error" });
        }
    }
});
app.delete("/venues/:id", async (req, res) => {
    try {
        await db.collection("Venues").doc(req.params["id"]).delete();
        return res.json({ ok: true });
    }
    catch (e) {
        if (e instanceof Error) {
            return res.status(500).json({ error: e.message });
        }
        else {
            return res.status(500).json({ error: "Unknown error" });
        }
    }
});
exports.VenueAPI = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map