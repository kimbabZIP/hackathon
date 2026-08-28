import React, { useState } from 'react';
import { GalleryItem } from '../types';
import { soundManager } from '../utils/audio';

interface GalleryModalProps {
  items: GalleryItem[];
  onClose: () => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ items, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[#04162e]/85 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative z-10 glass-panel-light w-full max-w-4xl rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="gold-filigree filigree-tl"></div>
        <div className="gold-filigree filigree-tr"></div>
        <div className="gold-filigree filigree-bl"></div>
        <div className="gold-filigree filigree-br"></div>

        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-[#775a19] hover:text-[#04162e] p-1 rounded-full hover:bg-black/5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Header */}
        <div className="text-center border-b border-[#775a19]/30 pb-3">
          <h3 className="font-speaker-name text-2xl sm:text-3xl font-bold text-[#04162e]">
            아카데미 갤러리 (Academic Gallery)
          </h3>
          <p className="font-dialogue-text text-sm text-[#44474d] italic mt-1">
            지도 교수들과 함께 나눈 아름답고 지적인 순간들의 삽화
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.unlocked) {
                  soundManager.playClick();
                  setSelectedImage(item);
                }
              }}
              className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                item.unlocked
                  ? 'border-[#775a19] shadow-md hover:shadow-xl hover:-translate-y-1'
                  : 'border-[#c5c6ce] opacity-60 bg-black/20'
              }`}
            >
              <div className="aspect-video w-full overflow-hidden bg-[#04162e]">
                {item.unlocked ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#ffdea5]/50 gap-2">
                    <span className="material-symbols-outlined text-3xl">lock</span>
                    <span className="font-ui-label text-xs">{item.unlockCondition}</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-[#fff8f2] border-t border-[#ffdea5]">
                <h4 className="font-speaker-name font-bold text-sm text-[#04162e]">{item.title}</h4>
                <p className="font-dialogue-text text-xs text-[#75777e] italic">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Image Preview */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center gap-4">
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.title}
              className="max-h-[75vh] w-auto rounded-xl shadow-2xl border-2 border-[#ffdea5]"
            />
            <div className="text-center text-[#ffdea5]">
              <h3 className="font-speaker-name text-2xl font-bold">{selectedImage.title}</h3>
              <p className="font-dialogue-text text-sm italic">{selectedImage.subtitle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
