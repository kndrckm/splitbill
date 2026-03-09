import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

type CameraStepProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stopCamera: () => void;
  takePhoto: () => void;
};

export const CameraStep: React.FC<CameraStepProps> = ({ videoRef, stopCamera, takePhoto }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black z-50 flex flex-col"
  >
    <div className="flex-1 relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div
          className="border-2 border-dashed border-white/70 rounded-xl"
          style={{ width: '72%', height: '52%' }}
        />
        <p className="mt-3 text-white/80 text-xs font-semibold tracking-wide bg-black/40 px-3 py-1 rounded-full">
          Posisikan nota di sini
        </p>
      </div>

      <button
        onClick={stopCamera}
        className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-3 rounded-full text-white"
      >
        <X size={24} />
      </button>
    </div>
    <div className="p-10 flex justify-center bg-black">
      <button
        onClick={takePhoto}
        className="w-20 h-20 bg-white rounded-full border-8 border-gray-300 flex items-center justify-center active:scale-90 transition-transform"
      >
        <div className="w-12 h-12 bg-red-500 rounded-full"></div>
      </button>
    </div>
  </motion.div>
);
