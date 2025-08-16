"use client";
import { useEffect, useLayoutEffect } from "react";
import rough from "roughjs/bundled/rough.esm.js";
import { useState } from "react";

const generator = rough.generator();
const Board = ({
  canvasRef,
  ctx,
  color,
  setElements,
  elements,
  tool,
  canvasColor,
  strokeWidth,
  updateCanvas,
  socket,
  lockStatus,
  requestLock,
  releaseLock,
  socketId,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.height = window.innerHeight * 2;
    canvas.width = window.innerWidth * 2;
    // canvas.style.width = `${window.innerWidth}px`;
    // canvas.style.height = `${window.innerHeight}px`;
    const context = canvas.getContext("2d");

    context.strokeWidth = 30;
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = color;
    context.lineWidth = 5;
    ctx.current = context;
  }, []);
  useLayoutEffect(() => {
    const roughCanvas = rough.canvas(canvasRef.current);
    if (elements.length > 0) {
      ctx.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
    elements.forEach((ele, i) => {
      if (ele.element === "rect") {
        roughCanvas.draw(
          generator.rectangle(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: ele.strokeWidth,
          })
        );
      } else if (ele.element === "line") {
        roughCanvas.draw(
          generator.line(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: ele.strokeWidth,
          })
        );
      } else if (ele.element === "pencil") {
        roughCanvas.linearPath(ele.path, {
          stroke: ele.stroke,
          roughness: 0,
          strokeWidth: ele.strokeWidth,
        });
      } else if (ele.element === "circle") {
        roughCanvas.draw(
          generator.ellipse(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: ele.strokeWidth,
          })
        );
      } else if (ele.element === "eraser") {
        roughCanvas.linearPath(ele.path, {
          stroke: ele.stroke,
          roughness: 0,
          strokeWidth: ele.strokeWidth,
        });
      }
    });
  }, [elements, elements?.length]);

  const handleMouseDown = (e) => {
    // Check if canvas is locked by another user
    if (lockStatus.isLocked && lockStatus.lockedBy !== socketId) {
      return; // Prevent drawing if locked by another user
    }

    // Request lock if not already locked
    if (!lockStatus.isLocked) {
      requestLock();
    }

    let offsetX;
    let offsetY;
    if (e.touches) {
      // Touch event
      var bcr = e.target.getBoundingClientRect();
      offsetX = e.targetTouches[0].clientX - bcr.x;
      offsetY = e.targetTouches[0].clientY - bcr.y;
    } else {
      // Mouse event
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }

    if (tool === "pencil") {
      setElements((prevElements) => [
        ...prevElements,
        {
          offsetX,
          offsetY,
          path: [[offsetX, offsetY]],
          stroke: color,
          element: tool,
          strokeWidth: strokeWidth,
        },
      ]);
    } else if (tool === "eraser") {
      setElements((prevElements) => [
        ...prevElements,
        {
          offsetX,
          offsetY,
          path: [[offsetX, offsetY]],
          stroke: canvasColor,
          element: tool,
          strokeWidth: strokeWidth > 30 ? strokeWidth : 30,
        },
      ]);
    } else {
      setElements((prevElements) => [
        ...prevElements,
        {
          offsetX,
          offsetY,
          stroke: color,
          element: tool,
          strokeWidth: strokeWidth,
        },
      ]);
    }
    setIsDrawing(true);
    updateCanvas(elements);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    // Release lock when drawing stops
    if (lockStatus.isLocked && lockStatus.lockedBy === socketId) {
      releaseLock();
    }
  };

  const handleMouseMove = (e) => {
    setEraser({
      x: e.clientX,
      y: e.clientY,
    });
    if (!isDrawing) {
      return;
    }
    let offsetX;
    let offsetY;
    if (e.touches) {
      // Touch event
      var bcr = e.target.getBoundingClientRect();
      offsetX = e.targetTouches[0].clientX - bcr.x;
      offsetY = e.targetTouches[0].clientY - bcr.y;
    } else {
      // Mouse event
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }

    if (tool === "rect") {
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
                offsetX: ele.offsetX,
                offsetY: ele.offsetY,
                width: offsetX - ele.offsetX,
                height: offsetY - ele.offsetY,
                stroke: ele.stroke,
                element: ele.element,
                strokeWidth: ele.strokeWidth,
              }
            : ele
        )
      );
    } else if (tool === "line") {
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
                offsetX: ele.offsetX,
                offsetY: ele.offsetY,
                width: offsetX,
                height: offsetY,
                stroke: ele.stroke,
                element: ele.element,
                strokeWidth: ele.strokeWidth,
              }
            : ele
        )
      );
    } else if (tool === "pencil") {
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
                offsetX: ele.offsetX,
                offsetY: ele.offsetY,
                path: [...ele.path, [offsetX, offsetY]],
                stroke: ele.stroke,
                element: ele.element,
                strokeWidth: ele.strokeWidth,
              }
            : ele
        )
      );
    } else if (tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(offsetX - elements[elements.length - 1].offsetX, 2) +
          Math.pow(offsetY - elements[elements.length - 1].offsetY, 2)
      );
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
                offsetX: ele.offsetX,
                offsetY: ele.offsetY,
                width: 2 * radius,
                height: 2 * radius,
                stroke: ele.stroke,
                element: ele.element,
                strokeWidth: ele.strokeWidth,
              }
            : ele
        )
      );
    } else if (tool === "eraser") {
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
                offsetX: ele.offsetX,
                offsetY: ele.offsetY,
                path: [...ele.path, [offsetX, offsetY]],
                stroke: ele.stroke,
                element: ele.element,
                strokeWidth: ele.strokeWidth,
              }
            : ele
        )
      );
    }
    updateCanvas(elements);
  };

  // Check if current user can draw
  const canDraw = !lockStatus.isLocked || lockStatus.lockedBy === socketId;

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      className="absolute top-0 left-0 w-screen h-screen"
    >
      <canvas
        ref={canvasRef}
        className={` absolute border-2 border-black  w-screen h-screen ${
          tool === "eraser" ? "cursor-none" : "cursor-crosshair"
        } ${!canDraw ? "cursor-not-allowed" : ""}`}
        style={{ backgroundColor: canvasColor }}
      />

      {/* Lock indicator overlay */}
      {lockStatus.isLocked && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg z-10">
          <div className="text-sm font-semibold">🔒 Canvas Locked</div>
          <div className="text-xs opacity-90">
            {lockStatus.lockedBy === socketId
              ? "You are drawing"
              : `${lockStatus.lockedByUserName || "Someone"} is drawing`}
          </div>
        </div>
      )}

      <div
        className=" eraser pointer-events-none bg-secondary"
        style={{
          display: tool === "eraser" ? "block" : "none",
          left: eraser.x,
          top: eraser.y,
          minHeight: `30px`,
          minWidth: `30px`,
          height: `${strokeWidth}px`,
          width: `${strokeWidth}px`,
        }}
      />
    </div>
  );
};

export default Board;
