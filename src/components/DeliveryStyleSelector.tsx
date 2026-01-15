import { DELIVERY_STYLES } from '@/config/deliveryStyles';

interface DeliveryStyleSelectorProps {
  selectedStyle: string;
  onSelect: (styleId: string) => void;
}

export function DeliveryStyleSelector({ 
  selectedStyle, 
  onSelect 
}: DeliveryStyleSelectorProps) {
  const selectedStyleData = DELIVERY_STYLES.find(s => s.id === selectedStyle);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎭</span>
        <h3 className="font-semibold text-foreground">Delivery Style</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DELIVERY_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={`
              p-2.5 rounded-lg border text-left transition-all
              ${selectedStyle === style.id 
                ? 'border-primary bg-primary/10 shadow-md shadow-primary/10' 
                : 'border-border bg-card hover:border-muted-foreground/50'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{style.emoji}</span>
              <span className={`text-sm font-medium ${
                selectedStyle === style.id ? 'text-primary' : 'text-foreground'
              }`}>
                {style.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected style description */}
      {selectedStyleData && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          <span className="font-medium text-foreground">{selectedStyleData.emoji} {selectedStyleData.name}:</span>{' '}
          {selectedStyleData.description}
        </p>
      )}
    </div>
  );
}
