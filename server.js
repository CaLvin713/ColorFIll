// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

// For Node 18+ fetch is global.
// If using an older Node version, install node-fetch and uncomment the next line:
// const fetch = require('node-fetch');

app.use(express.json());
app.use(express.static('public'));

// Ensure the downloads folder exists inside the public folder.
const downloadsDir = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}


// Function to read the prompt from prompt.txt
const getPrompt = () => {
  return fs.readFileSync('C:/lolalearn/public/prompt.txt', 'utf8').trim(); // Read the prompt & remove extra spaces
};

console.log(getPrompt()); 

// generate image
app.post('/api/generate-image', async (req, res) => {
  let promptText = req.body.prompt?.trim() || ""; // Handle empty prompt
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  // If no prompt is provided, use the default random image description
  if (!promptText) {
   //promptsend = "Generate a black-and-white stencil-style cartoon image with one character. Use bold, fully connected outlines with no gaps, ensuring all areas can be filled. the background should be minimal. The image should be simple, with clear, well-spaced sections. The background must be white, and there should be no shading, gradients, or fills. The style should be playful and kid-friendly, with a focus on clarity and ease of coloring. NO TEXT."
   promptsend = getPrompt();
   console.log("random");
  } else {
    // Handle other case here
    promptsend = `Generate a black-and-white stencil-style cartoon image of exactly one ${promptText}. The image must contain only one single ${promptText}, with no duplicate versions, mirrored reflections, or variations. 
    The ${promptText} should be in a single pose, fully visible, and occupying most of the image space. Do not include multiple versions, outlines, different styles, dashed lines, or alternative renderings of the same ${promptText}.
    Use bold, fully connected outlines with no gaps. The background should be completely white. There must be no shading, gradients, or fills. only a single, clean line drawing.
    Make sure there is only one final outlined version of the ${promptText}. No alternate renderings or duplicates. WHITE BACKGROUND"`;
    
  }
  
  try {
    // Call DALL·E API
    console.log(promptsend);
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        prompt: promptsend,
        model: "dall-e-3",        
        response_format: "url",
        size: "1024x1024",
        quality:"standard",
        n:1
      })
    });

    const data = await imageResponse.json();
    if (!imageResponse.ok || !data.data || data.data.length === 0) {
      return res.status(500).json({ error: 'Image generation failed', details: data });
    }

    const externalUrl = data.data[0].url;
    const urlObj = new URL(externalUrl);
    const ext = path.extname(urlObj.pathname) || '.png';
    const fileName = 'downloaded_' + Date.now() + ext;
    const filePath = path.join(downloadsDir, fileName);

    // Download and save the image locally using `downloadImage.js`
    const imgResponse = await fetch(externalUrl);
    if (!imgResponse.ok) {
      return res.status(500).json({ error: 'Error fetching external image' });
    }

    await streamPipeline(imgResponse.body, fs.createWriteStream(filePath));

    // Return both the local and external URLs
    return res.json({ localUrl: `/downloads/${fileName}`, externalUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Error generating image', details: error.message });
  }
});



app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
  