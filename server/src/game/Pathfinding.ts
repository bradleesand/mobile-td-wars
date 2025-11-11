import { Vector2, GAME_CONFIG, Tower } from '@shared/types';

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

export class Pathfinding {
  private gridWidth: number;
  private gridHeight: number;
  private gridSize: number;

  constructor() {
    this.gridSize = GAME_CONFIG.GRID_SIZE;
    this.gridWidth = Math.ceil(GAME_CONFIG.CANVAS_WIDTH / this.gridSize);
    this.gridHeight = Math.ceil(GAME_CONFIG.CANVAS_HEIGHT / this.gridSize);
  }

  /**
   * Find a path from start to end, avoiding towers
   * Returns array of grid positions, or empty array if no path found
   */
  findPath(start: Vector2, end: Vector2, towers: Tower[]): Vector2[] {
    // Convert world coordinates to grid coordinates
    const startGrid = this.worldToGrid(start);
    const endGrid = this.worldToGrid(end);

    // Create a set of blocked grid cells (where towers are)
    const blockedCells = new Set<string>();
    towers.forEach(tower => {
      const gridPos = this.worldToGrid(tower.position);
      blockedCells.add(`${gridPos.x},${gridPos.y}`);
    });

    // A* algorithm
    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startGrid.x,
      y: startGrid.y,
      g: 0,
      h: this.heuristic(startGrid, endGrid),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f cost
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      // Check if we reached the goal
      if (current.x === endGrid.x && current.y === endGrid.y) {
        return this.reconstructPath(current);
      }

      const currentKey = `${current.x},${current.y}`;
      closedSet.add(currentKey);

      // Check all neighbors
      const neighbors = this.getNeighbors(current, blockedCells);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Use the neighbor's cost (1.0 for cardinal, 1.414 for diagonal)
        const moveCost = (neighbor as any).cost || 1.0;
        const tentativeG = current.g + moveCost;

        // Check if neighbor is already in open list
        const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic({ x: neighbor.x, y: neighbor.y }, endGrid);
          neighbor.f = neighbor.g + neighbor.h;
          openList.push(neighbor);
        } else if (tentativeG < existingNode.g) {
          // Found a better path to this neighbor
          existingNode.parent = current;
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Get valid neighbors for a grid cell (8-directional with diagonals)
   */
  private getNeighbors(node: PathNode, blockedCells: Set<string>): PathNode[] {
    const neighbors: PathNode[] = [];
    const directions = [
      { x: 0, y: -1, cost: 1.0 },      // Up
      { x: 1, y: 0, cost: 1.0 },       // Right
      { x: 0, y: 1, cost: 1.0 },       // Down
      { x: -1, y: 0, cost: 1.0 },      // Left
      { x: 1, y: -1, cost: 1.414 },    // Up-Right (diagonal)
      { x: 1, y: 1, cost: 1.414 },     // Down-Right (diagonal)
      { x: -1, y: 1, cost: 1.414 },    // Down-Left (diagonal)
      { x: -1, y: -1, cost: 1.414 }    // Up-Left (diagonal)
    ];

    for (const dir of directions) {
      const x = node.x + dir.x;
      const y = node.y + dir.y;

      // Check bounds
      if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
        continue;
      }

      // Check if blocked by tower
      const key = `${x},${y}`;
      if (blockedCells.has(key)) {
        continue;
      }

      // For diagonal moves, ensure both adjacent cells are also free (no corner cutting)
      if (dir.x !== 0 && dir.y !== 0) {
        const key1 = `${node.x + dir.x},${node.y}`;
        const key2 = `${node.x},${node.y + dir.y}`;
        if (blockedCells.has(key1) || blockedCells.has(key2)) {
          continue; // Can't cut through corners
        }
      }

      neighbors.push({
        x,
        y,
        g: 0,
        h: 0,
        f: 0,
        parent: null,
        cost: dir.cost
      } as PathNode & { cost: number });
    }

    return neighbors;
  }

  /**
   * Octile distance heuristic (for 8-directional movement with diagonals)
   * More accurate than Manhattan for diagonal pathfinding
   */
  private heuristic(a: Vector2, b: Vector2): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    // Diagonal cost is 1.414, cardinal cost is 1.0
    // Use the minimum of dx/dy for diagonals, then add remaining cardinal distance
    return 1.414 * Math.min(dx, dy) + Math.abs(dx - dy);
  }

  /**
   * Reconstruct path from end node to start
   */
  private reconstructPath(endNode: PathNode): Vector2[] {
    const path: Vector2[] = [];
    let current: PathNode | null = endNode;

    while (current !== null) {
      // Convert grid coordinates back to world coordinates
      path.unshift(this.gridToWorld({ x: current.x, y: current.y }));
      current = current.parent;
    }

    return path;
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  private worldToGrid(pos: Vector2): Vector2 {
    return {
      x: Math.floor(pos.x / this.gridSize),
      y: Math.floor(pos.y / this.gridSize)
    };
  }

  /**
   * Convert grid coordinates to world coordinates (center of grid cell)
   */
  private gridToWorld(gridPos: Vector2): Vector2 {
    return {
      x: gridPos.x * this.gridSize + this.gridSize / 2,
      y: gridPos.y * this.gridSize + this.gridSize / 2
    };
  }
}
