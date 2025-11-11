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

        const tentativeG = current.g + 1; // Cost to move to neighbor

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
   * Get valid neighbors for a grid cell
   */
  private getNeighbors(node: PathNode, blockedCells: Set<string>): PathNode[] {
    const neighbors: PathNode[] = [];
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }  // Left
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

      neighbors.push({
        x,
        y,
        g: 0,
        h: 0,
        f: 0,
        parent: null
      });
    }

    return neighbors;
  }

  /**
   * Manhattan distance heuristic
   */
  private heuristic(a: Vector2, b: Vector2): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
