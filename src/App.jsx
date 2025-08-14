import React, { useState, useEffect, useRef } from 'react';

function App() {
    const [sliderValue, setSliderValue] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [newPath, setNewPath] = useState([]);
    const [allPaths, setAllPaths] = useState([]);
    const [events, setEvents] = useState([]);
    const [recordButtonText, setRecordButtonText] = useState('Start New Path');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [postamble, setPostamble] = useState('');
    const [goal, setGoal] = useState(0);
    const [current, setCurrent] = useState(0);
    const [showOverlay, setShowOverlay] = useState(true);
    const [formattedGoal, setFormattedGoal] = useState('');
    const [formattedCurrent, setFormattedCurrent] = useState('');

    const [isAdmin, setIsAdmin] = useState(false);


    const canvasTopRef = useRef(null);
    const canvasBottomRef = useRef(null);
    const overlayRef = useRef(null);
    const animationFrameId = useRef();

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('admin') === '1') {
            setIsAdmin(true);
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
            setGoal(configData.goal);
            setCurrent(configData.current);

            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });

            setFormattedGoal(formatter.format(configData.goal).replaceAll(',',''));
            setFormattedCurrent(formatter.format(configData.current).replaceAll(',',''));

            let percentage = (configData.current / configData.goal) * 100;
            percentage = Math.min(percentage, 100);
            animateSlider(percentage, 1000);

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
        drawCanvas();
    }, [sliderValue, allPaths, events, isRecording, newPath]); // Added dependencies

    const getCanvasTopContext = () => {
        const canvas = canvasTopRef.current;
        return canvas ? canvas.getContext('2d') : null;
    };
    const getCanvasBottomContext = () => {
        const canvas = canvasBottomRef.current;
        return canvas ? canvas.getContext('2d') : null;
    };

    const drawCanvas = () => {
        const ctxBottom = getCanvasBottomContext();
        if (!ctxBottom) return;
        const ctxTop = getCanvasTopContext();

        ctxBottom.clearRect(0, 0, ctxBottom.canvas.width, ctxBottom.canvas.height);
        ctxTop.clearRect(0, 0, ctxTop.canvas.width, ctxTop.canvas.height);

        if (isRecording) {
            drawRecordingFeedback(ctxBottom);
            return;
        }

        const progress = sliderValue / 100;

        allPaths.forEach(path => {
            const ctx = path.aboveOverlay ? ctxTop : ctxBottom;
            ctx.strokeStyle = path.strokeStyle;
            ctx.lineWidth = path.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const coords = path.coords;
            if (coords.length > 0) {
                ctx.moveTo(coords[0].x, coords[0].y);
                const segments = (coords.length - 1) * progress;
                for (let i = 0; i < segments; i++) {
                    if (coords[i + 1]) ctx.lineTo(coords[i + 1].x, coords[i + 1].y);
                }
                ctx.stroke();
            }
        });

        events.forEach(event => {
            const ctx = event.aboveOverlay ? ctxTop : ctxBottom;
            if (sliderValue >= event.percentage) {
                const glow = ctx.createRadialGradient(event.x, event.y, 0, event.x, event.y, event.radius);
                glow.addColorStop(0, 'rgba(255, 255, 0, 1)');
                glow.addColorStop(0.5, 'rgba(255, 255, 0, 0.7)');
                glow.addColorStop(1, 'rgba(255, 255, 0, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(event.x, event.y, event.radius, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    };

    const drawRecordingFeedback = (ctx) => {
        if (!ctx || newPath.length < 1) return;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(newPath[0].x, newPath[0].y);
        for (let i = 1; i < newPath.length; i++) {
            ctx.lineTo(newPath[i].x, newPath[i].y);
        }
        ctx.stroke();
    };

    const animateSlider = (targetValue, duration) => {
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
    };

    const handleRecordClick = () => {
        const nextRecordingState = !isRecording;
        setIsRecording(nextRecordingState);
        setShowOverlay(!nextRecordingState);
        const overlay = overlayRef.current;

        if (nextRecordingState) {
            setRecordButtonText('Save Path');
            setNewPath([]);
            if (overlay) overlay.style.pointerEvents = 'none';
        } else {
            if (overlay) overlay.style.pointerEvents = 'auto';
            if (newPath.length > 0) {
                const textToCopy = JSON.stringify(newPath);
                navigator.clipboard.writeText(textToCopy).then(() => {
                    setRecordButtonText('Copied! ✅');
                    setTimeout(() => setRecordButtonText('Start New Path'), 2000);
                }).catch(err => console.error('Failed to copy', err));
            } else {
                setRecordButtonText('Start New Path');
            }
        }
    };

    const getMousePos = (e) => {
        const rect = canvasTopRef.current.getBoundingClientRect();
        return {
            x: Math.round(e.clientX - rect.left),
            y: Math.round(e.clientY - rect.top)
        };
    };

    const handleMouseDown = (e) => {
        if (!isRecording) return;
        setIsDragging(true);
        setNewPath([getMousePos(e)]);
    };

    const handleMouseMove = (e) => {
        if (!isRecording || !isDragging) return;
        setNewPath(prevPath => [...prevPath, getMousePos(e)]);
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="App">
            <header className="app-header">
                <h1>{title}</h1>
                <p className="description" dangerouslySetInnerHTML={{ __html: description }}></p>
            </header>
            <main className="main-content">
                <div className="map-container">
                    <img id="mapImage" src="./map.png" width="1024" height="1024" alt="Map" />
                    <canvas
                        ref={canvasBottomRef}
                        id="pathCanvasBottom"
                        width="1024"
                        height="1024"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                    {showOverlay&&<img ref={overlayRef} id="overlayImage" src="./map_overlay.png" width="1024" height="1024" alt="Foreground elements" />}
                    <canvas
                        ref={canvasTopRef}
                        id="pathCanvasTop"
                        width="1024"
                        height="1024"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>
            <div className="app-footer">
                <p className="progress-text">
                    We've raised <strong>{formattedCurrent}</strong> of our <strong>{formattedGoal}</strong> goal!
                </p>
                <p className="postamble" dangerouslySetInnerHTML={{ __html: postamble }}></p>
                
                {/* Conditionally render the controls and helper text if isAdmin is true */}
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
                                disabled={isRecording}
                            />
                            {/*
                            <button
                                id="recordButton"
                                onClick={handleRecordClick}
                                className={isRecording ? 'recording' : ''}
                            >
                                {recordButtonText}
                            </button>
                            */}
                        </div>
                        {/*<p><small><em>To define a new path: Click 'Start', then click and drag on the map, then click 'Save'.</em></small></p>*/}
                        <p><a href="./admin.php">Admin site</a></p>
                    </>
                )}
            </div>

            </main>
        </div>
    );
}

export default App;
