async function detectIntent() {
  const userInput = document.getElementById("userInput").value;

  try {
    const response = awaitfetch('https://intentui.onrender.com/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: input })
});

    const data = await response.json();

    document.getElementById("output").innerHTML = `
      <strong>Action:</strong> ${data.action || "Not Found"}<br>
      <strong>Process:</strong> ${data.process || "Not Found"}<br>
      <strong>Request Type:</strong> ${data.requestType || "Not Clear"}
    `;
  } catch (error) {
    console.error("Error calling backend:", error);
    document.getElementById("output").innerText = "Error connecting to backend.";
  }
}
