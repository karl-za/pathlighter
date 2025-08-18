import React, { useState, useEffect, useRef, useCallback } from 'react';
import PathRecorder from './PathRecorder';

function App() {
    const [sliderValue, setSliderValue] = useState(0);
    const [allPaths, setAllPaths] = useState([]);
    const [events, setEvents] = useState([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [postamble, setPostamble] = useState('');
    const [formattedGoal, setFormattedGoal] = useState('');
    const [formattedCurrent, setFormattedCurrent] = useState('');

    const [isAdmin, setIsAdmin] = useState(false);
    const [isPathRecorder, setIsPathRecorder] = useState(false);

    const [config, setConfig] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isMapImageLoaded, setIsMapImageLoaded] = useState(false);
    const [isOverlayImageLoaded, setIsOverlayImageLoaded] = useState(false);


    const canvasTopRef = useRef(null);
    const canvasBottomRef = useRef(null);
    const overlayRef = useRef(null);
    const mapImageRef = useRef(null); 
    const animationFrameId = useRef();

    const animateSlider = useCallback((targetValue, duration) => {
        let startTime = null;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const currentValue = progress * targetValue;
            setSliderValue(currentValue);
            if (progress < 1) {
                animationFrameId.current = requestAnimationFrame(animate);
            }
        };
        animationFrameId.current = requestAnimationFrame(animate);
    }, []); 

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('admin') === '1') {
            setIsAdmin(true);
        }
        if (queryParams.get('pathrecorder') === '1') {
            setIsPathRecorder(true);
        }

        Promise.all([
            fetch('paths.json').then(res => res.json()),
            fetch('events.json').then(res => res.json()),
            fetch(`config.json?v=${new Date().getTime()}`).then(res => res.json())
        ]).then(([loadedPaths, loadedEvents, configData]) => {
            setAllPaths(loadedPaths);
            setEvents(loadedEvents);
            console.log(`Successfully loaded ${loadedPaths.length} paths and ${loadedEvents.length} events.`);

            setTitle(configData.title);
            setDescription(configData.description);
            setPostamble(configData.postamble);
            
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });

            setFormattedGoal(formatter.format(configData.goal).replaceAll(',',''));
            setFormattedCurrent(formatter.format(configData.current).replaceAll(',',''));

            setConfig(configData);
            setIsDataLoaded(true);

        }).catch(error => {
            console.error("Failed to load initial data:", error);
        });

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isDataLoaded && isMapImageLoaded && isOverlayImageLoaded && config) {
            console.log("All assets loaded, starting animation.");
            let percentage = (config.current / config.goal) * 100;
            percentage = Math.min(percentage, 100);
            animateSlider(percentage, 15000);
        }
    }, [isDataLoaded, isMapImageLoaded, isOverlayImageLoaded, config, animateSlider]);


    useEffect(() => {
        drawCanvas();
    }, [sliderValue, allPaths, events]); 

    const getCanvasTopContext = () => {
        const canvas = canvasTopRef.current;
        return canvas ? canvas.getContext('2d') : null;
    };
    const getCanvasBottomContext = () => {
        const canvas = canvasBottomRef.current;
        return canvas ? canvas.getContext('2d') : null;
    };

    function drawHalo(ctx, x, y, t, color) {
        // Define a base radius and a fluctuating radius for the halo
        const baseRadius = 30;
        
        // Use a combination of a sine wave and a subtle random factor to make the radius
        // vary in a non-strict, "organic" way.
        // The Math.sin() adds a continuous pulse, while the small random
        // component adds a slight, non-repeating wobble.
        const radiusFluctuation = 10 * Math.sin(t * 15) + (5 * Math.sin(t * 20));
        const haloRadius = baseRadius + radiusFluctuation;

        // Create a radial gradient for the fading effect
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);

        //gradient.addColorStop(0, color);
        //gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(0.5, 'rgba(255, 255,255, 0.3)');
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');


        // Draw the halo
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, haloRadius, 0, 2 * Math.PI);
        ctx.fill();
        }

    function getShimmeringColor(t) {
        // Define the start and end hue values for the blue/purple range
        const startHue = 290; // Blue
        const endHue = 320;   // Purple

        // Use a smooth wave function to map 't' from [0, 1] to the hue range
        const hue = startHue + (endHue - startHue) * ((Math.sin(t * 3*Math.PI) + 1) / 2);

        // Return the HSL color string
        return `hsl(${hue}, 100%, 50%)`;
    }

    const drawCanvas = () => {
        const ctxBottom = getCanvasBottomContext();
        if (!ctxBottom) return;
        const ctxTop = getCanvasTopContext();

        ctxBottom.clearRect(0, 0, ctxBottom.canvas.width, ctxBottom.canvas.height);
        ctxTop.clearRect(0, 0, ctxTop.canvas.width, ctxTop.canvas.height);

        const progress = sliderValue / 100;

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
                    const segmentEnd = Math.floor((coords.length - 1) *(sliderValue)/100);
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
                if (path.tail) segmentStart = Math.floor((coords.length - 1) *(sliderValue-path.tail)/100);
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

        events.forEach(event => {
            if (event.disabled)
                return;
            const ctx = event.aboveOverlay ? ctxTop : ctxBottom;
            if (event.functionCode) {
                const f = eval(event.functionCode);
                f(ctx, sliderValue);
            }
            if (sliderValue >= event.percentage) {
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

    if (isPathRecorder) {
        return(<PathRecorder/>)
    }

    return (
        <div className="App">
            <header className="app-header">
                <h1>{title}</h1>
                <p className="description" dangerouslySetInnerHTML={{ __html: description }}></p>
            </header>
            <main className="main-content">
                <div className="map-container">
                    <img 
                        ref={mapImageRef}
                        onLoad={() => setIsMapImageLoaded(true)}
                        id="mapImage" 
                        src="./map.png" 
                        width="1024" 
                        height="1024" 
                        alt="Map" 
                    />
                    <canvas
                        ref={canvasBottomRef}
                        id="pathCanvasBottom"
                        width="1024"
                        height="1024"
                    />
                    <img 
                        ref={overlayRef} 
                        onLoad={() => setIsOverlayImageLoaded(true)}
                        id="overlayImage" 
                        src="./map_overlay.png" 
                        width="1024" 
                        height="1024" 
                        alt="Foreground elements" 
                    />
                    <canvas
                        ref={canvasTopRef}
                        id="pathCanvasTop"
                        width="1024"
                        height="1024"
                    />
                </div>
            <div className="app-footer">
                <p className="progress-text">
                    We've raised <strong>{formattedCurrent}</strong> of our <strong>{formattedGoal}</strong> goal!
                </p>
                <p className="postamble" dangerouslySetInnerHTML={{ __html: postamble }}></p>
                
                {isAdmin && (
                    <>
                        <div className="controls">
                            <input
                                type="range"
                                id="pathSlider"
                                min="0"
                                max="100"
                                value={sliderValue}
                                onChange={(e) => setSliderValue(Number(e.target.value))}
                            />
                        </div>
                        <p><a href="./admin.php">Admin site</a></p>
                    </>
                )}
            </div>

            </main>
        </div>
    );
}

export default App;