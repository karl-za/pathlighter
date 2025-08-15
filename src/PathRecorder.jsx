import React, { useState, useEffect, useRef } from 'react';

function PathRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [newPath, setNewPath] = useState([]);
    const [recordButtonText, setRecordButtonText] = useState('Start New Path');
    const canvasRef = useRef(null);

    useEffect(() => {
        drawCanvas();
    }, [isRecording, newPath]); 

    const getCanvasContext = () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.getContext('2d') : null;
    };

    const drawCanvas = () => {
        const ctx = getCanvasContext();
        if (!ctx) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (isRecording) {
            drawRecordingFeedback(ctx);
            return;
        }
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

    const handleRecordClick = () => {
        const nextRecordingState = !isRecording;
        setIsRecording(nextRecordingState);

        if (nextRecordingState) {
            setRecordButtonText('Save Path');
            setNewPath([]);
        } else {
            if (newPath.length > 0) {
                const textToCopy = JSON.stringify(newPath);

                /*
                let objs = [];
                for (let c of newPath) {
                    objs.push(JSON.stringify({"x":c.x,"y":c.y, "radius": 15, "percentage": 5, "fillStyle": "gold", "aboveOverlay": true }));
                }
                const textToCopy=objs.join('\n');
                */

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
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: Math.round(e.clientX - rect.left),
            y: Math.round(e.clientY - rect.top)
        };
    };

    const handleMouseDown = (e) => {
        if (!isRecording) return;
        setIsDragging(true);
        setNewPath(prevPath => [...prevPath, getMousePos(e)]);
    };

    const handleMouseMove = (e) => {
        if (!isRecording || !isDragging) return;
        setNewPath(prevPath => [...prevPath, getMousePos(e)]);
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="PathRecorder">
            <div className="path-record-map-container">
                <img id="recorderMapImage" src="./map.png" alt="Map" />
                <canvas
                    ref={canvasRef}
                    id="recorderPathCanvas"
                    width="1024"
                    height="1024"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
            <div id="recorderControls" className="path-record-controls">
                <button id="recordButton" onClick={handleRecordClick} className={isRecording ? 'recording' : ''}>
                    {recordButtonText}
                </button>
            </div>
        </div>
    );
}

export default PathRecorder;
