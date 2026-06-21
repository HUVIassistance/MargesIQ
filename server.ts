import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Quote Analysis / Insight
  app.post("/api/gemini/insight", async (req, res) => {
    try {
      const {
        projectName,
        tradeType,
        operationalProfile,
        objective,
        complexity,
        quantity,
        unit,
        totalCosts,
        laborCost,
        materialCost,
        travelCost,
        cacCost,
        overheadCost,
        bufferPercent,
        recommendedPrice,
        minimumPrice,
        margeType,
        margeCible,
        margeReellePercent,
        strategicScore,
        ratioCR_CC,
        decisionStatus
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;

      // System instruction for pricing decisions
      const pricingPrompt = `Tu es Marges IQ, un expert en tarification stratégique et analyse financière pour les entreprises de services de terrain en français.
Analyse les détails de ce projet de soumission de services terrain de type "${tradeType}" (${operationalProfile}), et fournis EXACTEMENT UNE SEULE PHRASE d'observation ou recommandation stratégique pertinente d'un point de vue économique. Ne dépasse pas 25 mots.

Détails du projet "${projectName || "Sans nom"}":
- Quantité : ${quantity} ${unit}
- Complexité : ${complexity}
- Objectif principal : ${objective}
- Coûts totaux complets (CR) : ${totalCosts} $ (Main d'œuvre: ${laborCost} $, Matériaux: ${materialCost} $, Déplacement: ${travelCost} $, CAC: ${cacCost} $, Overhead de structure: ${overheadCost} $, Buffer de sécurité: ${bufferPercent}%)
- Prix recommandé optimal de soumission : ${recommendedPrice} $ (Prix minimal viable : ${minimumPrice} $)
- Marge cible demandée : ${margeCible} ${margeType === "percent" ? "%" : "$"} (Marge réelle estimée : ${margeReellePercent}%)
- Évaluation stratégique globale : Score de ${strategicScore}/12
- Ratio Coûts Complets / Coûts Cibles (CR/CC) : ${ratioCR_CC}
- Statut final décisionnel calculé par le système : ${decisionStatus}

Format de réponse attendu :
Une seule phrase percutante de recommandation (conseil ou mise en garde terrain). Pas de salutations. Pas de bla-bla. Sois direct, réaliste, et axé sur la rentabilité terrain.`;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        // Fallback static rules if Gemini API key isn't provided or is placeholder
        let quoteInsight = "";
        if (decisionStatus === "OK") {
          quoteInsight = "Excellente marge opérationnelle; projet à fort potentiel de profitabilité à valider rapidement.";
        } else if (decisionStatus === "OK FRAGILE") {
          quoteInsight = "Rentabilité fragile — tout imprévu ou hausse des matériaux peut compromettre la marge. Surveillez de près l'exécution.";
        } else if (decisionStatus === "RENÉGOCIER") {
          quoteInsight = "Risque financier modéré; ajustez le taux horaire de la main d'œuvre ou réduisez vos frais de déplacement pour sécuriser la marge.";
        } else if (decisionStatus === "NON RENTABLE") {
          quoteInsight = "Attention, prix proposé insuffisant pour couvrir les coûts opérationnels et le buffer. Réévaluation obligatoire.";
        } else {
          quoteInsight = "Projet hautement stratégique à fort score d'acquisition client malgré des marges initiales serrées.";
        }

        return res.json({ insight: quoteInsight, isMock: true });
      }

      // Initialize GoogleGenAI SDK as per gemini-api guidelines
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: pricingPrompt,
        config: {
          temperature: 0.7,
        },
      });

      const insightText = response.text?.trim() || "Rentabilité mesurable avec un profil de risque contrôlé.";
      res.json({ insight: insightText, isMock: false });
    } catch (error: any) {
      console.error("Gemini API error (resorting to local expert rules):", error);
      
      let fallbackInsight = "";
      const statusKey = req.body?.decisionStatus ? req.body.decisionStatus.toString().toUpperCase() : "";
      
      if (statusKey === "OK") {
        fallbackInsight = "Excellente marge opérationnelle; projet à fort potentiel de profitabilité à valider rapidement.";
      } else if (statusKey === "OK FRAGILE" || statusKey === "OK_FRAGILE") {
        fallbackInsight = "Rentabilité fragile — tout imprévu ou hausse des matériaux peut compromettre la marge. Surveillez de près l'exécution.";
      } else if (statusKey === "RENÉGOCIER" || statusKey === "RENEGOCIER") {
        fallbackInsight = "Risque financier modéré; ajustez le taux horaire de la main d'œuvre ou réduisez vos frais de déplacement pour sécuriser la marge.";
      } else if (statusKey === "NON RENTABLE" || statusKey === "NON_RENTABLE") {
        fallbackInsight = "Attention, prix proposé insuffisant pour couvrir les coûts opérationnels et le buffer. Réévaluation obligatoire.";
      } else {
        fallbackInsight = "Projet hautement stratégique à fort score d'acquisition client malgré des marges initiales serrées.";
      }

      res.json({ insight: fallbackInsight, isMock: true, error: error.message });
    }
  });

  // Serve static assets in production, use Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Marges IQ Server running on http://localhost:${PORT}`);
  });
}

startServer();
