import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Package, Warehouse } from 'lucide-react';

interface MapNode {
  id: string;
  name: string;
  type: 'warehouse' | 'transit_hub' | 'sorting_center' | 'delivery_center' | 'customer';
  latitude: number;
  longitude: number;
  isCurrent?: boolean;
  isCompleted?: boolean;
}

interface ShipmentMapProps {
  nodes: MapNode[];
  currentNodeId?: string;
}

const ShipmentMap = ({ nodes, currentNodeId }: ShipmentMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bounds
    const lats = nodes.map(n => n.latitude);
    const lngs = nodes.map(n => n.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const padding = 40;
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    // Convert lat/lng to canvas coordinates
    const toCanvasCoords = (lat: number, lng: number) => {
      const x = padding + ((lng - minLng) / lngRange) * (width - 2 * padding);
      const y = height - padding - ((lat - minLat) / latRange) * (height - 2 * padding);
      return { x, y };
    };

    // Draw routes (lines between nodes)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (let i = 0; i < nodes.length - 1; i++) {
      const from = toCanvasCoords(nodes[i].latitude, nodes[i].longitude);
      const to = toCanvasCoords(nodes[i + 1].latitude, nodes[i + 1].longitude);
      
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw nodes
    nodes.forEach((node, index) => {
      const { x, y } = toCanvasCoords(node.latitude, node.longitude);
      const isCurrent = node.id === currentNodeId;
      const isCompleted = index < nodes.findIndex(n => n.id === currentNodeId);

      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 12 : 8, 0, 2 * Math.PI);
      ctx.fillStyle = isCurrent ? '#3b82f6' : isCompleted ? '#10b981' : '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, x, y + 25);
    });
  }, [nodes, currentNodeId]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'warehouse': return <Warehouse className="h-4 w-4" />;
      case 'transit_hub': return <Navigation className="h-4 w-4" />;
      case 'sorting_center': return <Package className="h-4 w-4" />;
      case 'delivery_center': return <MapPin className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Shipment Route Map
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          📍 Demo Tracking System – Shipment movement is simulated for demonstration purposes
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative bg-slate-50 rounded-lg overflow-hidden" style={{ height: '400px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Current Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span>Upcoming</span>
          </div>
        </div>

        {/* Node List */}
        <div className="mt-4 space-y-2">
          {nodes.map((node, index) => {
            const isCurrent = node.id === currentNodeId;
            const isCompleted = index < nodes.findIndex(n => n.id === currentNodeId);
            
            return (
              <div
                key={node.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isCurrent ? 'bg-blue-50 border border-blue-200' : 
                  isCompleted ? 'bg-green-50 border border-green-200' : 
                  'bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isCurrent ? 'bg-blue-500 text-white' : 
                  isCompleted ? 'bg-green-500 text-white' : 
                  'bg-slate-300 text-slate-600'
                }`}>
                  {getNodeIcon(node.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{node.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {node.type.replace(/_/g, ' ')}
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-xs font-medium text-blue-600">Current</span>
                )}
                {isCompleted && (
                  <span className="text-xs font-medium text-green-600">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentMap;
