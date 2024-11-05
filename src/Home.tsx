  

    import { ColorSwatch, Group } from '@mantine/core';
    import './index.css';
    
    declare global {
        interface Window {
            MathJax: any;
        }
    }
    
    import { useEffect, useRef, useState } from 'react';
    import axios from 'axios';
    import Draggable from 'react-draggable';
    import { SWATCHES } from './costants';
    
    interface GeneratedResult {
        expression: string;
        answer: string;
    }
    
    interface Response {
        expr: string;
        result: string;
        assign: boolean;
    }
    
    export default function Home() {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [color, setColor] = useState('rgb(255, 255, 255)');
        const [reset, setReset] = useState(false);
        const [isEraserMode, setIsEraserMode] = useState(false);
        const [dictOfVars, setDictOfVars] = useState({});
        const [result, setResult] = useState<GeneratedResult>();
        const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
        const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    
        useEffect(() => {
            if (latexExpression.length > 0 && window.MathJax) {
                setTimeout(() => {
                    window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
                }, 0);
            }
        }, [latexExpression]);
    
        useEffect(() => {
            if (result) {
                renderLatexToCanvas(result.expression, result.answer);
            }
        }, [result]);
    
        useEffect(() => {
            if (reset) {
                resetCanvas();
                setLatexExpression([]);
                setResult(undefined);
                setDictOfVars({});
                setReset(false);
            }
        }, [reset]);
    
        useEffect(() => {
            const canvas = canvasRef.current;
    
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx!.lineCap = 'round';
                ctx!.lineWidth = 3;
            }
    
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
            script.async = true;
            document.head.appendChild(script);
    
            script.onload = () => {
                window.MathJax.Hub.Config({
                    tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
                });
            };
    
            return () => {
                document.head.removeChild(script);
            };
        }, []);
    
        const renderLatexToCanvas = (expression: string, answer: string) => {
            const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
            setLatexExpression([...latexExpression, latex]);
    
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        };
    
        const resetCanvas = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx!.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    
        const getEventPosition = (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return { offsetX: 0, offsetY: 0 };
            const rect = canvas.getBoundingClientRect();
    
            if (e.nativeEvent instanceof MouseEvent) {
                return {
                    offsetX: e.nativeEvent.offsetX,
                    offsetY: e.nativeEvent.offsetY,
                };
            } else {
                const touch = (e as React.TouchEvent).touches[0];
                return {
                    offsetX: touch.clientX - rect.left,
                    offsetY: touch.clientY - rect.top,
                };
            }
        };
    
        const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            const { offsetX, offsetY } = getEventPosition(e);
    
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx!.beginPath();
                ctx!.moveTo(offsetX, offsetY);
                setIsDrawing(true);
                e.preventDefault();
            }
        };

       
    
        const draw = (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing) return;
            const canvas = canvasRef.current;
            const { offsetX, offsetY } = getEventPosition(e);
    
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if(isEraserMode){
                    ctx!.globalCompositeOperation = 'destination-out';
                    ctx!.lineCap = 'round';
                    ctx!.lineJoin = 'round';
                    ctx!.lineWidth = 50;

                }else{
                    ctx!.globalCompositeOperation = 'source-over';
                    ctx!.strokeStyle = color;
                    ctx!.lineWidth = 3;

                }
                ctx!.lineTo(offsetX, offsetY);
                ctx!.stroke();
                e.preventDefault();
            }
            
        };
    
        const stopDrawing = () => setIsDrawing(false);
    
        const runRoute = async () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars
                });
                const resp = await response.data;
                resp.data.forEach((data: Response) => {
                    if (data.assign) {
                        setDictOfVars(prev => ({ ...prev, [data.expr]: data.result }));
                    }
                });
    
                const ctx = canvas.getContext('2d');
                const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    
                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        if (imageData.data[i + 3] > 0) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }
    
                setLatexPosition({
                    x: (minX + maxX) / 2,
                    y: (minY + maxY) / 2
                });
                resp.data.forEach((data: Response) => {
                    setTimeout(() => {
                        setResult({
                            expression: data.expr,
                            answer: data.result
                        });
                    }, 1000);
                });
            }
        };

       
    
        return (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-900 rounded-lg shadow-lg">
                    <button onClick={() => setReset(true)} className="z-20 px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-500 transition duration-200 w-full sm:w-auto">
                        Reset
                    </button>
    
                    <Group className="z-20 flex items-center justify-center gap-2">
                        {SWATCHES.map((swatch) => (
                            <ColorSwatch key={swatch} color={swatch} onClick={() => {setColor(swatch); setIsEraserMode(false)}} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full cursor-pointer hover:opacity-75 transition-opacity duration-150" />
                        ))}
                    </Group>

                    <button onClick={() => setIsEraserMode((prev) => !prev)} className={`z-20 px-4 py-2 font-semibold rounded-lg transition duration-200 w-full sm:w-auto ${isEraserMode ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                    {isEraserMode ? 'Eraser Mode On' : 'Eraser Mode Off'}
                        </button>
    
                    <button onClick={runRoute} className="z-20 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition duration-200 w-full sm:w-auto">
                        Run
                    </button>
                </div>
    
                <canvas
                    ref={canvasRef}
                    id="canvas"
                    className={`absolute top-0 left-0 w-full h-full border border-gray-200 rounded-lg shadow-inner ${isEraserMode ? 'cursor-cell' : 'cursor-crosshair'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    
                />
    
                {latexExpression && latexExpression.map((latex, index) => (
                    <Draggable key={index} defaultPosition={latexPosition} onStop={(_e, data) => setLatexPosition({ x: data.x, y: data.y })}>
                        <div className="absolute p-2 bg-gray-800 text-white rounded-lg shadow-md max-w-xs sm:max-w-sm md:max-w-md">
                            <div className="latex-content font-mono text-xs sm:text-sm md:text-base">{latex}</div>
                        </div>
                    </Draggable>
                ))}
            </>
        );
    }
    