import React from 'react';
import IconButton from '../buttons/IconButton';

const InfoBar = ({ 
  description, 
  headlineWords = [], // Array of strings: ["Driving", "Demand", "&"]
  highlightWord,      // The word next to the image: "Discovery"
  highlightImage, 
  primaryBtn = { text: "", link: "" },
  secondaryBtn = { text: "", link: "" }
}) => {
  return (
    <section className="w-full min-h-[400px] font-sans bg-[#f0f0f0]">
      <div className="container mx-auto">
        <div className="w-full py-20 flex flex-col md:flex-row justify-between items-start gap-10">
          
          {/* Left Column */}
          <div className="w-full md:w-[35%] pt-2">
            <p className="text-xl md:text-2xl leading-[1.2] text-black font-medium tracking-tight">
              {description}
            </p>
          </div>

          {/* Right Column */}
          <div className="w-full md:w-[55%] flex flex-col items-start md:items-end">
            <h1 className="max-w-[50rem] text-black flex flex-wrap gap-x-3 gap-y-1 justify-start md:justify-end items-center text-[3.5rem] md:text-[5.5rem] font-bold leading-[1] tracking-tighter">
              {headlineWords.map((word, index) => (
                <span key={index}>{word}</span>
              ))}
              
              <span className="flex items-center gap-3">
                {highlightWord}
                <div className="aspect-square h-[4rem] md:h-[5.5rem] rounded-xl overflow-hidden inline-block shadow-sm">
                  <img
                    src={highlightImage}
                    alt={highlightWord}
                    className="w-full h-full object-cover"
                  />
                </div>
              </span>
            </h1>

            {/* Buttons Group */}
            <div className="mt-12 flex flex-wrap gap-4">
              <IconButton 
                text={primaryBtn.text} 
                link={primaryBtn.link} 
                variant="primary" 
              />
              <IconButton 
                text={secondaryBtn.text} 
                link={secondaryBtn.link} 
                variant="secondary" 
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default InfoBar;