const express = require('express');
const cors = require('cors');
const use = require('@tensorflow-models/universal-sentence-encoder');
const tf = require('@tensorflow/tfjs-node');

const app = express();
app.use(cors());
app.use(express.json());

// Action keywords
const actions = {
  Create: ["create", "add new", "make"],
  Update: ["modify", "update", "edit", "make changes"],
  Delete: ["delete", "remove"],
  Retrieve: ["view", "search", "show", "see"],
  Query: ["query", "ask", "analyze"]
};

// Process list
const processes = [
  "process 1", "process 2", "process 3", "process 4",
  "process 5", "process 6", "process 7", "process 8",
  "process 9", "process 10"
];

let model;

// Load the model at start
use.load().then(m => {
  model = m;
  console.log('✅ Model loaded');
});

// Helper: cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
app.post('/analyze', async (req, res) => {
  const text = req.body.text.toLowerCase();

  if (!model) {
    return res.status(503).json({ error: "Model not loaded yet. Please wait and try again." });
  }

  try {
    const userEmbedding = await model.embed([text]);
    const userVec = userEmbedding.arraySync()[0];

    // --- Step 1: Exact keyword match for action ---
    let exactAction = null;
    for (const [action, keywords] of Object.entries(actions)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          exactAction = action;
          break;
        }
      }
      if (exactAction) break;
    }

    // --- Step 2: Semantic fallback if no exact action match ---
    let bestAction = exactAction;
    let bestActionScore = -1;
    if (!exactAction) {
      for (const [action, keywords] of Object.entries(actions)) {
        for (const keyword of keywords) {
          const keywordEmbedding = await model.embed([keyword]);
          const keywordVec = keywordEmbedding.arraySync()[0];
          const score = cosineSimilarity(userVec, keywordVec);
          if (score > bestActionScore) {
            bestActionScore = score;
            bestAction = action;
          }
        }
      }
    }

    // --- Step 3: Exact keyword match for process ---
    let exactProcess = null;
    for (const process of processes) {
      if (text.includes(process)) {
        exactProcess = process;
        break;
      }
    }

    // --- Step 4: Semantic fallback if no exact process match ---
    let bestProcess = exactProcess;
    let bestProcessScore = -1;
    if (!exactProcess) {
      for (const process of processes) {
        const processEmbedding = await model.embed([process]);
        const processVec = processEmbedding.arraySync()[0];
        const score = cosineSimilarity(userVec, processVec);
        if (score > bestProcessScore) {
          bestProcessScore = score;
          bestProcess = process;
        }
      }
    }

    // --- Step 5: Use thresholds only for semantic match ---
    const ACTION_THRESHOLD = 0.35;
    const PROCESS_THRESHOLD = 0.35;

    if (!exactAction && bestActionScore < ACTION_THRESHOLD) {
      bestAction = "Not Found";
    }
    if (!exactProcess && bestProcessScore < PROCESS_THRESHOLD) {
      bestProcess = "Not Found";
    }

    // --- Step 6: Decide request type ---
    let requestType = "Not Clear";
    if (bestAction !== "Not Found" && bestProcess !== "Not Found") {
      requestType = "Process Centric";
    } else if (bestAction !== "Not Found" && text.includes("customer")) {
      requestType = "Complex";
    }

    res.json({
      action: bestAction,
      process: bestProcess,
      requestType
    });

  } catch (err) {
    console.error("❌ Error analyzing intent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Start the server
app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});
