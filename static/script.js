document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const scale = window.devicePixelRatio;

    let texts = ["...", "BTC", "=", "...", "USD"];
    let editingIndex = -1;
    let cursorVisible = true;
    let lastUpdateTime = 0;
    let exchangeRate = 0;

    function initializeCanvas() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener("click", onCanvasClick);
        document.addEventListener("keydown", onDocumentKeyDown);
        fetchBTCtoUSD();
        setInterval(fetchBTCtoUSD, 5000);
    }

    function resizeCanvas() {
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
        canvas.width = Math.floor(window.innerWidth * scale);
        canvas.height = Math.floor(window.innerHeight * scale);
        ctx.scale(scale, scale);
        draw();
    }

    function draw() {
        clearCanvas();
        setupTextStyles();
        drawTextsAndRectangles();
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function setupTextStyles() {
        ctx.font = '70px Helvetica';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    }

    function drawTextsAndRectangles() {
        const middleY = canvas.height / (2 * scale);
        const textHeight = 60;
        const padding = 20;
        const totalWidth = calculateTotalWidth();
        let currentX = (canvas.width / scale - totalWidth) / 2;

        texts.forEach((text, index) => {
            const textWidth = ctx.measureText(text).width;
            currentX += textWidth / 2;
            ctx.fillText(text, currentX, middleY);
            if (text !== "=") drawRectangleAroundText(textWidth, currentX, middleY, textHeight, padding, index);
            currentX += textWidth / 2 + padding;
        });
    }

    function drawRectangleAroundText(textWidth, currentX, middleY, textHeight, padding, index) {
        ctx.strokeRect(currentX - textWidth / 2 - padding / 2, middleY - textHeight / 2 - padding / 2, textWidth + padding, textHeight + padding);
        if (editingIndex === index && cursorVisible) drawCursor(currentX, middleY, textHeight, textWidth);
    }

    function drawCursor(currentX, middleY, textHeight, textWidth) {
        const cursorX = currentX + textWidth / 2 + 2;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2; 
        ctx.beginPath();
        ctx.moveTo(cursorX, middleY - textHeight / 2);
        ctx.lineTo(cursorX, middleY + textHeight / 2);
        ctx.stroke();
        ctx.strokeStyle = 'white';
    }

    function calculateTotalWidth() {
        const padding = 20;
        const textWidths = texts.map(text => ctx.measureText(text).width);
        return textWidths.reduce((acc, width) => acc + width, 0) + padding * (texts.length - 1);
    }

    function onCanvasClick(event) {
        const {x, y} = getCanvasRelativeCoords(event);
        editingIndex = getClickedIndex(x, y);
        if (editingIndex !== -1 && texts[editingIndex] !== "=") {
            cursorVisible = true;
            lastUpdateTime = Date.now();
            updateCursor();
        } else {
            editingIndex = -1;
        }
        draw();
    }

    function getCanvasRelativeCoords(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX / scale,
            y: (event.clientY - rect.top) * scaleY / scale
        };
    }

    function getClickedIndex(x, y) {
        const middleY = canvas.height / (2 * scale);
        const textHeight = 60;
        const padding = 20;
        const totalWidth = calculateTotalWidth();
        let currentX = (canvas.width / scale - totalWidth) / 2;

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const textWidth = ctx.measureText(text).width;
            currentX += textWidth / 2;

            if (text !== "=") {
                const rectX = currentX - textWidth / 2 - padding / 2;
                const rectY = middleY - textHeight / 2 - padding / 2;
                const rectWidth = textWidth + padding;
                const rectHeight = textHeight + padding;

                if (x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight) {
                    return i;
                }
            }

            currentX += textWidth / 2 + padding;
        }

        return -1;    }

    function updateCursor() {
        const currentTime = Date.now();
        if (currentTime - lastUpdateTime > 500) {
            cursorVisible = !cursorVisible;
            lastUpdateTime = currentTime;
            draw();
        }
        if (editingIndex !== -1) requestAnimationFrame(updateCursor);
    }

    async function fetchBTCtoUSD() {
        const url = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
        try {
            const response = await fetch(url);
            const data = await response.json();
            exchangeRate = parseFloat(data.data.rates.USD);

            const btcValue = parseFloat(texts[0]) || 1; // Fallback to 1 if parsing fails
            updateExchangeValues("BTC", btcValue); // Update with current BTC value
            draw(); // Redraw canvas with new values
        } catch (error) {
            console.error("Error fetching BTC to USD rate:", error);
            exchangeRate = 0;
            texts[0] = "Error";
            texts[3] = "Error";
            draw();
        }
    }

    function updateExchangeValues(editedCurrency, editedValue) {
        if (exchangeRate === 0) return; // Skip if exchange rate is not available

        if (editedCurrency === "BTC") {
            texts[0] = editedValue.toString();
            texts[3] = (editedValue * exchangeRate).toFixed(2); // Convert BTC to USD
        } else if (editedCurrency === "USD") {
            texts[3] = editedValue.toString();
            texts[0] = (editedValue / exchangeRate).toFixed(8); // Convert USD to BTC
        }
    }

    function onDocumentKeyDown(event) {
        if (editingIndex !== -1 && texts[editingIndex] !== "=") {
            if (event.key === "Backspace") {
                texts[editingIndex] = texts[editingIndex].slice(0, -1);
            } else if (event.key.length === 1) {
                texts[editingIndex] += event.key;
            }

            if (editingIndex === 0) { // If BTC value is edited
                const btcValue = parseFloat(texts[0]) || 0;
                updateExchangeValues("BTC", btcValue);
            } else if (editingIndex === 3) { // If USD value is edited
                const usdValue = parseFloat(texts[3]) || 0;
                updateExchangeValues("USD", usdValue);
            }

            draw();
        }
    }

    initializeCanvas();
});
