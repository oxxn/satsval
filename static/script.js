document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const scale = window.devicePixelRatio;

    let texts = ["1", "BTC", "=", "1", "USD"];
    let editingIndex = -1;
    let cursorVisible = true;
    let lastUpdateTime = 0;
    let exchangeRate = 0;
    let numberOpacity = 1;
    let activeIndex = 0; // Initialize active field to text[0]
    let lastGoodExchangeValues = { BTC: "1", USD: "1" }; // Store last good exchange values

    function initializeCanvas() {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
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
        ctx.font = '70px Geologica';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    }

    function drawTextsAndRectangles() {
        const middleY = canvas.height / (2 * scale);
        const padding = 25;
        const totalWidth = calculateTotalWidth();
        const tallestTextHeight = calculateTallestTextHeight();
        let currentX = (canvas.width / scale - totalWidth) / 2;
    
        texts.forEach((text, index) => {
            const textWidth = ctx.measureText(text).width;
            currentX += textWidth / 2;
    
            if (index === 0 || index === 3) {
                ctx.fillStyle = index === activeIndex ? '#CCFFCC' : 'white'; // Active field in green
            }
            
            // Adjust opacity for exchange rate text
            if (index === 0 || index === 3) {
                ctx.globalAlpha = index === activeIndex ? 1 : numberOpacity;  // Apply opacity

            }
    
            ctx.fillText(text, currentX, middleY + 5);
    
            // Reset for other elements
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 1;
    
            if (text !== "=") {
                drawRectangleAroundText(textWidth, currentX, middleY, tallestTextHeight, padding, index);
            }
    
            currentX += textWidth / 2 + padding;
        });
    }    

    function calculateTallestTextHeight() {
        return texts.reduce((tallest, text) => {
            const metrics = ctx.measureText(text);
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            return Math.max(tallest, actualHeight);
        }, 0);
    }

    function drawRectangleAroundText(textWidth, currentX, middleY, textHeight, padding, index) {
        const rectX = currentX - textWidth / 2 - padding / 2;
        const rectY = middleY - textHeight / 2 - padding / 2;
        ctx.strokeRect(rectX, rectY, textWidth + padding, textHeight + padding);
        if (editingIndex === index && cursorVisible) drawCursor(currentX, middleY, textHeight + padding, textWidth);
    }

    function drawCursor(currentX, middleY, textHeight, textWidth) {
        const cursorX = currentX + textWidth / 2 + 2;
        ctx.strokeStyle = '#9D0000';
        ctx.lineWidth = 2; 
        ctx.beginPath();
        ctx.moveTo(cursorX, middleY - textHeight / 2.4);
        ctx.lineTo(cursorX, middleY + textHeight / 2.4);
        ctx.stroke();
        ctx.strokeStyle = 'white';
    }

    function calculateTotalWidth() {
        const padding = 20;
        const textWidths = texts.map(text => ctx.measureText(text).width);
        return textWidths.reduce((acc, width) => acc + width, 0) + padding * (texts.length - 1);
    }

    function handleInput(index, key) {
        if (index === 1 && key === null) {
            // Toggle between "BTC" and "sats" for texts[1]
            texts[1] = texts[1] === "BTC" ? "SAT" : "BTC";
            editingIndex = -1;
            cursorVisible = false;
        } else if (index === -1 || index === 4) {
            editingIndex = -1;
            cursorVisible = false;
        } else if (index === 0 || index === 3) {
            activeIndex = index;
            editingIndex = index;
            cursorVisible = true;
            lastUpdateTime = Date.now();
            updateCursor();
        } else {
            editingIndex = -1;
            cursorVisible = false;
        }
    
        // Handle text input
        if (editingIndex !== -1 && key !== null) {
            if (key === "Backspace") {
                texts[editingIndex] = texts[editingIndex].slice(0, -1);
            } else if (key.length === 1) {
                texts[editingIndex] += key;
            }
    
            if (editingIndex === 0) { // If BTC value is edited
                updateExchangeValues("BTC", texts[editingIndex]);
            } else if (editingIndex === 3) { // If USD value is edited
                updateExchangeValues("USD", texts[editingIndex]);
            }
        }
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
    
        const calculateBoundingBox = (textWidth, currentX) => ({
            rectX: currentX - textWidth / 2 - padding / 2,
            rectY: middleY - textHeight / 2 - padding / 2,
            rectWidth: textWidth + padding,
            rectHeight: textHeight + padding
        });
    
        return texts.reduce((clickedIndex, text, i) => {
            if (clickedIndex === -1 && i !== 2) {
                const textWidth = ctx.measureText(text).width;
                const currentX = (canvas.width / scale - calculateTotalWidth()) / 2 
                                + texts.slice(0, i).reduce((acc, t) => acc + ctx.measureText(t).width + padding, 0) 
                                + textWidth / 2;
                const { rectX, rectY, rectWidth, rectHeight } = calculateBoundingBox(textWidth, currentX);
    
                if (x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight) {
                    return i;
                }
            }
            return clickedIndex;
        }, -1);
    }
    
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
            const rateData = await response.json();
            exchangeRate = parseFloat(rateData.data.rates.USD);
    
            // Only update values if the active field contains a valid number
            let activeValue = parseFloat(texts[activeIndex]);
            if (!isNaN(activeValue)) {
                if (activeIndex === 0) { // Active field is BTC
                    updateExchangeValues("BTC", texts[0]);
                } else if (activeIndex === 3) { // Active field is USD
                    updateExchangeValues("USD", texts[3]);
                }
            } else {
                // If the active field's value is not valid, update the inactive field with the last good value
                if (activeIndex === 0) {
                    texts[3] = lastGoodExchangeValues.USD;
                } else if (activeIndex === 3) {
                    texts[0] = lastGoodExchangeValues.BTC;
                }
            }
            draw(); // Redraw canvas with new values
        } catch (error) {
            console.error("Error fetching BTC to USD rate:", error);
            exchangeRate = 0;
            texts[0] = "Error";
            texts[3] = "Error";
            draw();
        }
        animateExchangeRateFadeIn();
    }
    

    function updateExchangeValues(editedCurrency, editedValue) {
        if (exchangeRate === 0) return; // Skip if exchange rate is not available
    
        let numericValue = parseFloat(editedValue);
    
        if (editedCurrency === "BTC") {
            texts[0] = editedValue; // Keep the user input as-is
            if (!isNaN(numericValue)) {
                texts[3] = (numericValue * exchangeRate).toFixed(2);
                lastGoodExchangeValues.USD = texts[3];
            } else {
                texts[3] = lastGoodExchangeValues.USD; // Keep the last good value if input doesn't parse
            }
        } else if (editedCurrency === "USD") {
            texts[3] = editedValue; // Keep the user input as-is
            if (!isNaN(numericValue)) {
                texts[0] = (numericValue / exchangeRate).toFixed(8);
                lastGoodExchangeValues.BTC = texts[0];
            } else {
                texts[0] = lastGoodExchangeValues.BTC; // Keep the last good value if input doesn't parse
            }
        }
    }

    function animateExchangeRateFadeIn() {
        numberOpacity = 0.35;
        function increaseOpacity() {
            if (numberOpacity < 1) {
                numberOpacity += 0.015;  // Adjust fade speed here
                draw();
                requestAnimationFrame(increaseOpacity);
            }
        }
        increaseOpacity();
    }

    function onCanvasClick(event) {
        const { x, y } = getCanvasRelativeCoords(event);
        const clickedIndex = getClickedIndex(x, y);
    
        handleInput(clickedIndex, null);
    
        draw();
    }

    function onDocumentKeyDown(event) {
        if (editingIndex !== -1) {
            handleInput(editingIndex, event.key);
            draw();
        }
    }

    initializeCanvas();
});
