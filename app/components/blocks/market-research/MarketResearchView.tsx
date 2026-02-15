'use client';

import type { DeepDiveModule, MarketResearchData, BlockType } from '@/lib/types/canvas';
import { TamSamSomModule } from './TamSamSomModule';
import { SegmentationModule } from './SegmentationModule';
import { PersonaModule } from './PersonaModule';
import { MarketValidationModule } from './MarketValidationModule';
import { CompetitiveLandscapeModule } from './CompetitiveLandscapeModule';

interface MarketResearchViewProps {
  activeModule: DeepDiveModule;
  data: MarketResearchData;
  canvasId: string;
  blockType: BlockType;
  generatingModule: DeepDiveModule | null;
  aiEnabled: boolean;
  onGeneratingChange: (module: DeepDiveModule | null) => void;
  onDataChange: (data: MarketResearchData) => void;
}

export function MarketResearchView({
  activeModule,
  data,
  canvasId,
  blockType,
  generatingModule,
  aiEnabled,
  onGeneratingChange,
  onDataChange,
}: MarketResearchViewProps) {
  const handleGenerate = async (module: DeepDiveModule, inputs?: Record<string, string>) => {
    if (!aiEnabled) return;
    onGeneratingChange(module);
    try {
      const res = await fetch(`/api/canvas/${canvasId}/blocks/${blockType}/deep-dive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, inputs: inputs ?? {} }),
      });
      if (res.ok) {
        const json = await res.json();
        onDataChange(json.updatedDeepDive);
      }
    } finally {
      onGeneratingChange(null);
    }
  };

  const handleSave = async (updated: MarketResearchData) => {
    onDataChange(updated);
    await fetch(`/api/canvas/${canvasId}/blocks/${blockType}/deep-dive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deepDiveJson: JSON.stringify(updated) }),
    });
  };

  return (
    <>
      {activeModule === 'tam_sam_som' && (
        <TamSamSomModule
          data={data.tamSamSom}
          isGenerating={generatingModule === 'tam_sam_som'}
          aiEnabled={aiEnabled}
          onGenerate={(inputs) => handleGenerate('tam_sam_som', inputs)}
          onSave={(tamSamSom) => handleSave({ ...data, tamSamSom })}
        />
      )}
      {activeModule === 'segmentation' && (
        <SegmentationModule
          data={data.segmentation}
          isGenerating={generatingModule === 'segmentation'}
          aiEnabled={aiEnabled}
          onGenerate={() => handleGenerate('segmentation')}
          onSave={(segmentation) => handleSave({ ...data, segmentation })}
        />
      )}
      {activeModule === 'personas' && (
        <PersonaModule
          data={data.personas}
          segments={data.segmentation?.segments ?? []}
          isGenerating={generatingModule === 'personas'}
          aiEnabled={aiEnabled}
          onGenerate={() => handleGenerate('personas')}
          onSave={(personas) => handleSave({ ...data, personas })}
        />
      )}
      {activeModule === 'market_validation' && (
        <MarketValidationModule
          data={data.marketValidation}
          isGenerating={generatingModule === 'market_validation'}
          aiEnabled={aiEnabled}
          onGenerate={() => handleGenerate('market_validation')}
          onSave={(marketValidation) => handleSave({ ...data, marketValidation })}
        />
      )}
      {activeModule === 'competitive_landscape' && (
        <CompetitiveLandscapeModule
          data={data.competitiveLandscape}
          isGenerating={generatingModule === 'competitive_landscape'}
          aiEnabled={aiEnabled}
          onGenerate={() => handleGenerate('competitive_landscape')}
          onSave={(competitiveLandscape) => handleSave({ ...data, competitiveLandscape })}
        />
      )}
    </>
  );
}
