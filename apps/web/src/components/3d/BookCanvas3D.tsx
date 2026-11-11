"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import ExperienceCanvas, { ExperienceCanvasProps } from "./ExperienceCanvas";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { isAudioFeedbackEnabled, setAudioFeedbackEnabled } from "@/lib/archival-audio";

export interface BookCanvas3DProps extends ExperienceCanvasProps {
  allowFullscreen?: boolean;
  showAudioControl?: boolean;
}

export function BookCanvas3D({
  allowFullscreen = true,
  showAudioControl = true,
  className = "",
  ...canvasProps
}: BookCanvas3DProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAudioEnabled(isAudioFeedbackEnabled());
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail) {
        setAudioEnabled(custom.detail.enabled);
      }
    };
    window.addEventListener("memoria:audio-change", handler);
    return () => window.removeEventListener("memoria:audio-change", handler);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document) return;
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleToggleAudio = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    setAudioFeedbackEnabled(next);
  }, [audioEnabled]);

  return (
    <div
      ref={containerRef}
      className={`relative group ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#F7F4EE] flex flex-col p-4 sm:p-6" : "w-full"
      } ${className}`}
    >
      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
        {showAudioControl && (
          <button
            type="button"
            onClick={handleToggleAudio}
            title={audioEnabled ? "Mute Archival Paper Acoustics" : "Enable Archival Paper Acoustics"}
            aria-label={audioEnabled ? "Mute archival sounds" : "Enable archival sounds"}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white/90 hover:bg-white border border-[#E7E2DA] text-[#20242C] shadow-xs backdrop-blur-md transition-all cursor-pointer"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-[#76556F]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#8D857A]" />
            )}
          </button>
        )}

        {allowFullscreen && (
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Experience"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-white/90 hover:bg-white border border-[#E7E2DA] text-[#20242C] shadow-xs backdrop-blur-md transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-[#20242C]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[#20242C]" />
            )}
          </button>
        )}
      </div>

      <ExperienceCanvas {...canvasProps} className={isFullscreen ? "h-full flex-1" : ""} />
    </div>
  );
}

export default BookCanvas3D;
