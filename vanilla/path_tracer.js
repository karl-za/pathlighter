let currentValue = 0;

function drawHalo(ctx, x, y, t) {
    const baseRadius = 30;
    const radiusFluctuation = 10 * Math.sin(t * 15) + (5 * Math.sin(t * 20));
    const haloRadius = baseRadius + radiusFluctuation;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.5, 'rgba(255, 255,255, 0.3)');
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, 2 * Math.PI);
    ctx.fill();
}

function getShimmeringColor(t) {
    const startHue = 290; // Blue
    const endHue = 320;   // Purple
    const hue = startHue + (endHue - startHue) * ((Math.sin(t * 3*Math.PI) + 1) / 2);
    return `hsl(${hue}, 100%, 50%)`;
}

function drawCanvas() {
    const ctxTop = document.getElementById('pathCanvasTop').getContext('2d');
    const ctxBottom = document.getElementById('pathCanvasBottom').getContext('2d');
    ctxBottom.clearRect(0, 0, ctxBottom.canvas.width, ctxBottom.canvas.height);
    ctxTop.clearRect(0, 0, ctxTop.canvas.width, ctxTop.canvas.height);
    const progress = currentValue / 100;
    // allPaths is imported from paths.js in index.html
    allPaths.forEach(path => {
        if (path.disabled)
            return;
        const ctx = path.aboveOverlay ? ctxTop : ctxBottom;
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const coords = path.coords;
        if (coords.length > 0) {
            if (path.trail) {
                ctx.beginPath();
                const segments = (coords.length - 1) * progress;
                ctx.moveTo(coords[0].x, coords[0].y);
                for (let i = 0; i < segments; i++) {
                    if (coords[i + 1]) ctx.lineTo(coords[i + 1].x, coords[i + 1].y);
                }
                ctx.strokeStyle = path.trail;
                ctx.stroke();
            }
            if (path.bespoke) {
                ctx.lineWidth = 15;
                const segmentEnd = Math.floor((coords.length - 1) *(currentValue)/100);
                ctx.beginPath();
                ctx.moveTo(coords[segmentEnd].x, coords[segmentEnd].y);
                ctx.lineTo(coords[segmentEnd].x+1, coords[segmentEnd].y+1);
                const c = getShimmeringColor(progress);
                ctx.strokeStyle = c;
                ctx.stroke();
                if (segmentEnd<coords.length-5)
                drawHalo(ctxTop,coords[segmentEnd].x, coords[segmentEnd].y,progress*path.seq,'blue')
                return;
            }
            let segmentStart = 0;
            if (path.tail) segmentStart = Math.floor((coords.length - 1) *(currentValue-path.tail)/100);
            if (segmentStart<0) segmentStart=0;
            ctx.beginPath();
            const segments = (coords.length - 1) * progress;
            for (let i = segmentStart; i < segments; i++) {
                if (i===segmentStart)
                    ctx.moveTo(coords[i].x, coords[i].y);
                if (coords[i + 1]) ctx.lineTo(coords[i + 1].x, coords[i + 1].y);
            }
            ctx.strokeStyle = path.strokeStyle;
            ctx.stroke();
        }
    });
    // events are imported from events.js in index.html
    events.forEach(event => {
        if (event.disabled)
            return;
        const ctx = event.aboveOverlay ? ctxTop : ctxBottom;
        if (currentValue >= event.percentage) {
            const glow = ctx.createRadialGradient(event.x, event.y, 0, event.x, event.y, event.radius);
            glow.addColorStop(0, 'rgba(255, 255, 0, 1)');
            glow.addColorStop(0.5, 'rgba(255, 255, 0, 0.7)');
            glow.addColorStop(1, 'rgba(255, 255, 0, 0)');
            ctx.fillStyle = event.fillStyle || glow;
            ctx.beginPath();
            ctx.arc(event.x, event.y, event.radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
};

function animateProgress(targetValue, duration) {
    let startTime = null;
    function animationStep(currentTime) {
        if (!startTime) {
            startTime = currentTime;
        }
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1); // Cap progress at 1 (100%)
        currentValue = progress * targetValue;
        drawCanvas();
        if (progress < 1) {
            requestAnimationFrame(animationStep);
        }
    }
    requestAnimationFrame(animationStep);
}

async function initialize() {
    // load the config data (goal, current amount, secondsToAnimate)
    let useHardcodedConfig = false;
    let config;
    if (useHardcodedConfig) {
        config = {
            "goal": 15000,
            "current": 3000,
            "secondsToAnimate": 10
        }
    } else {
        const response = await fetch(`config.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            throw new Error('Could not load fundraiser data.');
        }
        config = await response.json();    
        console.log(config)
    }

    // build the progress message
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    const goal = config.goal;
    const current = config.current;
    const goalFormatted = formatter.format(goal).replaceAll(',','');
    const currentFormatted = formatter.format(current).replaceAll(',','');
    console.log(`We have raised ${goalFormatted} of our ${currentFormatted} goal!`)

    let percentage = (current / goal) * 100;
    if (goal === 0) { 
        percentage = 0;
    }
    percentage = Math.min(percentage, 100);

    animateProgress(percentage, config.secondsToAnimate*1000);
}


initialize(); 
