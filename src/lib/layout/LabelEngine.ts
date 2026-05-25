import RBush from 'rbush';

export interface LabelInput {
  id: string;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  text: string;
}

export interface PlacedLabel {
  id: string;
  text: string;
  x: number; // Absolute screen X (top-left)
  y: number; // Absolute screen Y (top-left)
  width: number;
  height: number;
  anchorX: number; // Where the leader line connects to pin
  anchorY: number;
  fontSize: number;
  isWrapped: boolean;
  isHidden: boolean;
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id?: string;
  isStatic?: boolean; // Marker pins or edges
}

// 8 cardinal and intercardinal positions for candidate placement.
// Arranged in order of preference (top-right usually best, etc.)
const CANDIDATE_VECTORS = [
  { dx: 1, dy: -1 },  // Top-Right
  { dx: 1, dy: 0 },   // Right
  { dx: 0, dy: -1 },  // Top
  { dx: -1, dy: -1 }, // Top-Left
  { dx: -1, dy: 0 },  // Left
  { dx: 1, dy: 1 },   // Bottom-Right
  { dx: 0, dy: 1 },   // Bottom
  { dx: -1, dy: 1 }   // Bottom-Left
];

const OFFSET_DIST = 24; // Base distance from anchor to label box edge

export class LabelEngine {
  private width: number;
  private height: number;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.width = viewportWidth;
    this.height = viewportHeight;
  }

  public computeLayout(labels: LabelInput[]): PlacedLabel[] {
    const tree = new RBush<BBox>();
    const results = new Map<string, PlacedLabel>();

    // 1. Insert static obstacles (marker pins)
    // We treat the anchor points (pins) as obstacles so labels don't cover other pins.
    const staticObstacles: BBox[] = labels.map(l => ({
      minX: l.anchorX - 16,
      minY: l.anchorY - 24, // Assuming pin goes up from anchor
      maxX: l.anchorX + 16,
      maxY: l.anchorY + 8,
      isStatic: true
    }));
    tree.load(staticObstacles);

    // 2. Iterate each label and find the best non-colliding candidate state
    for (const label of labels) {
      const bestCandidate = this.findBestCandidate(label, tree);
      
      if (bestCandidate) {
        results.set(label.id, bestCandidate);
        // Insert accepted candidate into the spatial index to block future labels
        tree.insert({
          minX: bestCandidate.x - 2, // Slight padding
          minY: bestCandidate.y - 2,
          maxX: bestCandidate.x + bestCandidate.width + 2,
          maxY: bestCandidate.y + bestCandidate.height + 2,
          id: label.id
        });
      } else {
        // If NO configuration works, hide it completely (fallback)
        results.set(label.id, {
          ...label,
          x: 0, y: 0,
          fontSize: 14,
          isWrapped: false,
          isHidden: true
        });
      }
    }

    // Convert map to array in original order
    return labels.map(l => results.get(l.id)!);
  }

  private findBestCandidate(label: LabelInput, tree: RBush<BBox>): PlacedLabel | null {
    // Priority 1: Repositioning at original size
    for (const vec of CANDIDATE_VECTORS) {
      const candidate = this.createCandidate(label, vec, 14, false);
      if (!this.checkCollision(candidate, tree)) return candidate;
    }

    // Priority 2: Wrap text (reduces width, increases height)
    for (const vec of CANDIDATE_VECTORS) {
      const candidate = this.createCandidate(label, vec, 14, true);
      if (!this.checkCollision(candidate, tree)) return candidate;
    }

    // Priority 3: Resize font down to 11px + un-wrapped
    for (const vec of CANDIDATE_VECTORS) {
      const candidate = this.createCandidate(label, vec, 11, false);
      if (!this.checkCollision(candidate, tree)) return candidate;
    }

    // Priority 4: Resize font down to 11px + wrapped
    for (const vec of CANDIDATE_VECTORS) {
      const candidate = this.createCandidate(label, vec, 11, true);
      if (!this.checkCollision(candidate, tree)) return candidate;
    }

    // If all fail, return null (triggers hidden state)
    return null;
  }

  private createCandidate(label: LabelInput, vec: {dx: number, dy: number}, fontSize: number, wrap: boolean): PlacedLabel {
    // Estimate sizing based on string length (approximate)
    // Production note: Exact measuring requires DOM, but doing it in JS is much faster.
    const charWidth = fontSize * 0.6;
    let w = label.width;
    let h = label.height;

    if (fontSize !== 14) {
       w = w * (fontSize / 14);
       h = h * (fontSize / 14);
    }

    if (wrap) {
      w = w * 0.6;
      h = h * 1.8;
    }

    // Calculate top-left based on vector
    // vec points to where the label should be relative to anchor.
    // e.g. dx=1 (right), dy=-1 (top).
    let x = label.anchorX;
    let y = label.anchorY;

    if (vec.dx === 1) x += OFFSET_DIST;
    if (vec.dx === -1) x -= (w + OFFSET_DIST);
    if (vec.dx === 0) x -= (w / 2);

    if (vec.dy === 1) y += OFFSET_DIST;
    if (vec.dy === -1) y -= (h + OFFSET_DIST);
    if (vec.dy === 0) y -= (h / 2);

    return {
      id: label.id,
      text: label.text,
      anchorX: label.anchorX,
      anchorY: label.anchorY,
      x, y,
      width: w, height: h,
      fontSize,
      isWrapped: wrap,
      isHidden: false
    };
  }

  private checkCollision(candidate: PlacedLabel, tree: RBush<BBox>): boolean {
    // 1. Check viewport bounds (must be fully visible)
    if (
      candidate.x < 10 || 
      candidate.y < 10 || 
      candidate.x + candidate.width > this.width - 10 || 
      candidate.y + candidate.height > this.height - 10
    ) {
      return true;
    }

    // 2. Query spatial index
    const colliders = tree.search({
      minX: candidate.x,
      minY: candidate.y,
      maxX: candidate.x + candidate.width,
      maxY: candidate.y + candidate.height
    });

    return colliders.length > 0;
  }
}
