document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const scale = window.devicePixelRatio;

    let texts = ["1", "BTC", "=", "......", "USD"];
    let editingIndex = -1;
    let cursorVisible = true;
    let lastUpdateTime = 0;
    let exchangeRate = 0;
    let numberOpacity = 1;
    let activeIndex = 0; // Initialize active field to text[0]
    let lastGoodExchangeValues = { BTC: "1", USD: "1" }; // Store last good exchange values

    let textBoundingBoxes = [];
    let baseFontSize;
    let padding;

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
        // Adjust base font size and padding dynamically based on screen size
        baseFontSize = Math.min(window.innerWidth, window.innerHeight) / 50;
        padding = baseFontSize / 0.6;  // Adjust padding in proportion to font size
        ctx.font = `${baseFontSize}px Geologica`;
        draw();
    }

    function draw() {
        clearCanvas();
        setupTextStyles();
        drawTextsAndRectangles();
        drawSATSVAL();
    }

    function drawSATSVAL() {
        const fontSize = baseFontSize * 2; // Larger font for SATSVAL
        ctx.font = `${fontSize}px Geologica`; // Set the font size
        ctx.fillStyle = 'white'; // Set the text color
        ctx.textAlign = 'left';
        // Calculate the position based on baseFontSize
        const xPosition = baseFontSize; // Adjust as needed for horizontal positioning
        const yPosition = fontSize; // Position it at approximately one font size down from the top
        ctx.fillText("satsval", xPosition, yPosition); // Draw "SATSVAL" at the calculated position
    }
    
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function setupTextStyles() {
        ctx.font = `${baseFontSize * 3.5}px Geologica`; // Adjust font size for main texts
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = baseFontSize * 0.06;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    }

    function drawTextsAndRectangles() {
        textBoundingBoxes = [];
        const middleY = canvas.height / (2 * scale);
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
    
            ctx.fillText(text, currentX, middleY + baseFontSize * 0.25);
    
            // Reset for other elements
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 1;
    
            if (text !== "=") {
                const rectX = currentX - textWidth / 2 - padding / 2;
                const rectY = middleY - tallestTextHeight / 2 - padding / 2;
                const rectWidth = textWidth + padding;
                const rectHeight = tallestTextHeight + padding;
                drawRectangleAroundText(textWidth, currentX, middleY, tallestTextHeight, padding, index);
                textBoundingBoxes.push({ rectX, rectY, rectWidth, rectHeight });
            }
            else
                textBoundingBoxes.push(null);
    
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
        
        // Draw cursor for editing index
        if (editingIndex === index && cursorVisible) {
            drawCursor(currentX, middleY, textHeight + padding, textWidth);
        }
    }

    function drawCursor(currentX, middleY, textHeight, textWidth) {
        const cursorX = currentX + textWidth / 2 + 2;
        ctx.strokeStyle = '#CC0000';
        ctx.lineWidth = baseFontSize * 0.06;
        ctx.beginPath();
        ctx.moveTo(cursorX, middleY - textHeight / 2.4);
        ctx.lineTo(cursorX, middleY + textHeight / 2.4);
        ctx.stroke();
        ctx.strokeStyle = 'white';
    }

    function calculateTotalWidth() {
        const textWidths = texts.map(text => ctx.measureText(text).width);
        return textWidths.reduce((acc, width) => acc + width, 0) + padding * (texts.length - 1);
    }

    function handleInput(index, key) {
        if (index === 1 && key === null) {
            // Toggle between "BTC" and "sats" for texts[1]
            texts[1] = texts[1] === "BTC" ? "SAT" : "BTC";
            editingIndex = -1;
            cursorVisible = false;
    
            // Recalculate exchange values based on the new unit
            let activeValue = texts[activeIndex === 0 ? 0 : 3];
            if (activeValue !== "") {
                updateExchangeValues(activeIndex === 0 ? "BTC" : "USD", activeValue);
            } else {
                texts[0] = "0";
                texts[3] = "0";
            }
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
        return textBoundingBoxes.findIndex((bbox, index) => {
            if (bbox && texts[index] !== "=") {
                const { rectX, rectY, rectWidth, rectHeight } = bbox;
                return x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight;
            }
            return false;
        });
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
    
            let activeValue = texts[activeIndex];
    
            // Check if the active field is empty and set the other field to 0
            if (activeValue === "") {
                if (activeIndex === 0) {
                    texts[3] = "0"; // Set USD to 0 if BTC is empty
                } else if (activeIndex === 3) {
                    texts[0] = "0"; // Set BTC to 0 if USD is empty
                }
            } else {
                // Only update values if the active field contains a valid number
                let numericValue = parseFloat(activeValue);
                if (!isNaN(numericValue)) {
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
            }
            draw(); // Redraw canvas with new values
        } catch (error) {
            console.error("Error fetching BTC to USD rate:", error);
            draw();
        }
        animateExchangeRateFadeIn();
    }         

    function updateExchangeValues(editedCurrency, editedValue) {
        if (exchangeRate === 0) return; // Skip if exchange rate is not available
    
        let numericValue = parseFloat(editedValue);
    
        if (editedCurrency === "BTC") {
            texts[0] = editedValue; // Keep the user input as-is
            if (editedValue === "") {
                texts[3] = "0"; // Set USD to 0 if BTC is empty
            } else if (!isNaN(numericValue)) {
                // Adjust for Satoshis if needed
                let conversionFactor = texts[1] === "SAT" ? 100000000 : 1;
                let convertedValue = numericValue * exchangeRate / conversionFactor;
    
                convertedValue = roundToSignificantDigits(convertedValue, 4);
                texts[3] = formatUSDValue(convertedValue);
                lastGoodExchangeValues.USD = texts[3];
            } else {
                texts[3] = lastGoodExchangeValues.USD; // Keep the last good value if input doesn't parse
            }
        } else if (editedCurrency === "USD") {
            texts[3] = editedValue; // Keep the user input as-is
            if (editedValue === "") {
                texts[0] = "0"; // Set BTC to 0 if USD is empty
            } else if (!isNaN(numericValue)) {
                // Adjust for Satoshis if needed
                let conversionFactor = texts[1] === "SAT" ? 100000000 : 1;
                let convertedValue = numericValue / exchangeRate * conversionFactor;
    
                if (texts[1] === "SAT") {
                    convertedValue = Math.floor(convertedValue);
                } else {
                    convertedValue = roundToSignificantDigits(convertedValue, 4);
                }
    
                texts[0] = formatBTCValue(convertedValue);
                lastGoodExchangeValues.BTC = texts[0];
            } else {
                texts[0] = lastGoodExchangeValues.BTC; // Keep the last good value if input doesn't parse
            }
        }
        document.title = texts[3] + " USD - satsval";
    }
    
    function formatBTCValue(value) {
        if (value === 0)
            return "0";
        // Show at most 8 decimal digits for BTC
        if (Math.abs(value) < 0.01)
            return value.toFixed(8);
        else
            return value.toString(); // Ensure the return value is a string
    }
    
    function formatUSDValue(value) {
        if (value === 0)
            return "0";
        // Show up to 4 decimal digits for USD values between 1 and 0
        if (Math.abs(value) > 0 && Math.abs(value) < 1) {
            return value.toFixed(4);
        }
        if (Math.abs(value) > 1 && Math.abs(value) < 1000)
            return value.toFixed(2);
        return value.toString(); // Ensure the return value is a string
    }
      

    function roundToSignificantDigits(num, n) {
        if (num === 0) {
            return 0;
        }

        const d = Math.ceil(Math.log10(Math.abs(num)));
        const power = n - d;
        const magnitude = Math.pow(10, power);
        const shifted = Math.round(num * magnitude);
        const rounded = shifted / magnitude;

        // Determine the number of decimal places required
        const decimalPlaces = power > 0 ? power : 0;
        const formattedNumber = rounded.toFixed(decimalPlaces);

        // Return the formatted number without trailing zeros
        return parseFloat(formattedNumber);
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
