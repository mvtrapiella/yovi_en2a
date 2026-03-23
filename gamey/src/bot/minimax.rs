use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};
use std::collections::{HashMap, HashSet, VecDeque};

pub const MINIMAX_DEPTH_EASY:   u32 = 2;
pub const MINIMAX_DEPTH_MEDIUM: u32 = 4;
pub const MINIMAX_DEPTH_HARD:   u32 = 6;

const WIN_SCORE:   i32 = 1000000;
const LOSS_SCORE:  i32 = -1000000;
const UNREACHABLE: i32 = 1000; 

pub struct MinimaxBot { depth: u32 }

impl MinimaxBot {
    pub fn new(depth: u32) -> Self { Self { depth } }
    pub fn depth(&self) -> u32 { self.depth }
}

impl YBot for MinimaxBot {
    fn name(&self) -> &str { "minimax_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        if board.available_cells().is_empty() { return None; }
        let bot = board.next_player()?;
        if self.depth == 0 {
            return board.available_cells().first()
                .map(|&idx| Coordinates::from_index(idx, board.board_size()));
        }
        
        let (mut best_score, mut best_move, mut alpha) = (i32::MIN, None, i32::MIN);
        for idx in candidate_cells(board) {
            let coords: Coordinates = Coordinates::from_index(idx, board.board_size());
            let mut child: GameY = board.clone();
            let _ = child.add_move(Movement::Placement { player: bot, coords });
            let score: i32 = minimax(&child, self.depth - 1, i32::MIN, i32::MAX, false, bot);
            if score > best_score { 
                best_score = score; 
                best_move = Some(coords); 
            }
            alpha = alpha.max(best_score);
        }
        best_move
    }
}


fn minimax(board: &GameY, depth: u32, mut alpha: i32, mut beta: i32, maximizing: bool, bot: PlayerId) -> i32 {
    if board.check_game_over() {
        return match board.status() {
            GameStatus::Finished { winner } => if *winner == bot { WIN_SCORE } else { LOSS_SCORE },
            GameStatus::Ongoing { .. } => evaluate(board, bot),
        };
    }
    if depth == 0 || board.available_cells().is_empty() { return evaluate(board, bot); }

    let player = match board.next_player() { Some(p) => p, None => return evaluate(board, bot) };
    let mut best = if maximizing { i32::MIN } else { i32::MAX };

    for idx in candidate_cells(board) {
        let coords = Coordinates::from_index(idx, board.board_size());
        let mut child = board.clone();
        let _ = child.add_move(Movement::Placement { player, coords });
        let score = minimax(&child, depth - 1, alpha, beta, !maximizing, bot);

        if maximizing {
            if score > best { best = score; }
            alpha = alpha.max(best);
        } 
        else {
            if score < best { best = score; }
            beta = beta.min(best);
        }
        if alpha >= beta { break; }
    }
    best
}


fn evaluate(board: &GameY, bot: PlayerId) -> i32 {
    let opp = other_player(bot);

    let bot_passable = passable_cells(board, bot);
    let opp_passable = passable_cells(board, opp);
    let bot_groups   = connected_groups(board, bot);
    let opp_groups   = connected_groups(board, opp);

    let bot_score = position_score(&bot_groups, &bot_passable);
    let opp_score = position_score(&opp_groups, &opp_passable);

    opp_score - bot_score
}

fn position_score(groups: &[Vec<Coordinates>], passable: &HashSet<Coordinates>) -> i32 {
    if groups.is_empty() { return UNREACHABLE * 3; }

    groups.iter().map(|group| {
        let distance_a = dist_to_side(group, 0, passable);
        let distance_b = dist_to_side(group, 1, passable);
        let distance_c = dist_to_side(group, 2, passable);
        distance_a + distance_b + distance_c
    }).min().unwrap_or(UNREACHABLE * 3)
}

fn passable_cells(board: &GameY, player: PlayerId) -> HashSet<Coordinates> {
    let size = board.board_size();
    (0..size*(size+1)/2)
        .map(|idx| Coordinates::from_index(idx, size))
        .filter(|c| {
            let owner = board.cell_owner(c);
            owner.is_none() || owner == Some(player)
        })
        .collect()
}

fn connected_groups(board: &GameY, player: PlayerId) -> Vec<Vec<Coordinates>> {
    let size = board.board_size();
    let available: HashSet<u32> = board.available_cells().iter().copied().collect();
    let owned: HashSet<Coordinates> = (0..size*(size+1)/2)
        .map(|idx| Coordinates::from_index(idx, size))
        .filter(|c| !available.contains(&c.to_index(size)) && board.cell_owner(c) == Some(player))
        .collect();

    let mut visited: HashSet<Coordinates> = HashSet::new();
    let mut groups = Vec::new();

    for &cell in &owned {
        if visited.contains(&cell) { continue; }
        let mut group = Vec::new();
        let mut queue = VecDeque::from([cell]);
        visited.insert(cell);
        while let Some(cur) = queue.pop_front() {
            group.push(cur);
            for n in neighbours(&cur) {
                if owned.contains(&n) && visited.insert(n) { queue.push_back(n); }
            }
        }
        groups.push(group);
    }
    groups
}


fn dist_to_side(group: &[Coordinates], side: u8, passable: &HashSet<Coordinates>) -> i32 {
    let group_set: HashSet<Coordinates> = group.iter().copied().collect();
    let mut dist: HashMap<Coordinates, i32> = HashMap::new();
    let mut deque: VecDeque<Coordinates> = VecDeque::new();
    let mut visited: HashSet<Coordinates> = HashSet::new();

    for &cell in group {
        dist.insert(cell, 0);
        deque.push_front(cell);
    }

    while let Some(current) = deque.pop_front() {
        if !visited.insert(current) { continue; }
        let current_dist = dist[&current];

        let on_side = match side {
            0 => current.touches_side_a(),
            1 => current.touches_side_b(),
            _ => current.touches_side_c(),
        };
        if on_side { return current_dist; }

        for neighbour in neighbours(&current) {
            if !passable.contains(&neighbour) || visited.contains(&neighbour) { continue; }
            let cost = if group_set.contains(&neighbour) { 0 } else { 1 };
            let new_dist = current_dist + cost;
            if new_dist < *dist.get(&neighbour).unwrap_or(&UNREACHABLE) {
                dist.insert(neighbour, new_dist);
                if cost == 0 { deque.push_front(neighbour); } else { deque.push_back(neighbour); }
            }
        }
    }
    UNREACHABLE
}

fn candidate_cells(board: &GameY) -> Vec<u32> {
    let size = board.board_size();
    let available: HashSet<u32> = board.available_cells().iter().copied().collect();

    let occupied: HashSet<Coordinates> = (0..size*(size+1)/2)
        .map(|index| Coordinates::from_index(index, size))
        .filter(|c| !available.contains(&c.to_index(size)))
        .collect();

    if occupied.is_empty() {
        return board.available_cells().clone();
    }

    board.available_cells().iter().copied()
        .filter(|&idx| {
            let c = Coordinates::from_index(idx, size);
            neighbours(&c).iter().any(|n| occupied.contains(n))
        })
        .collect()
}

fn other_player(player: PlayerId) -> PlayerId {
    if player.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) }
}

fn neighbours(c: &Coordinates) -> Vec<Coordinates> {
    let (x, y, z) = (c.x(), c.y(), c.z());
    let mut neighbours = Vec::with_capacity(6);
    if x > 0 { neighbours.push(Coordinates::new(x-1,y+1,z)); neighbours.push(Coordinates::new(x-1,y,z+1)); }
    if y > 0 { neighbours.push(Coordinates::new(x+1,y-1,z)); neighbours.push(Coordinates::new(x,y-1,z+1)); }
    if z > 0 { neighbours.push(Coordinates::new(x+1,y,z-1)); neighbours.push(Coordinates::new(x,y+1,z-1)); }
    neighbours
}

#[cfg(test)]
mod tests {
    use super::*;

    fn place(game: &mut GameY, moves: &[(u32, (u32, u32, u32))]) {
        for &(p, (x, y, z)) in moves {
            game.add_move(Movement::Placement {
                player: PlayerId::new(p),
                coords: Coordinates::new(x, y, z),
            }).unwrap();
        }
    }

    // Bot identity 

    #[test]
    fn test_name() { assert_eq!(MinimaxBot::new(2).name(), "minimax_bot"); }

    #[test]
    fn test_depth_getter() { assert_eq!(MinimaxBot::new(4).depth(), 4); }

    // Basic move selection 
    #[test]
    fn test_returns_move_on_empty_board() {
        assert!(MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&GameY::new(4)).is_some());
    }

    #[test]
    fn test_returns_none_on_full_board() {
        let mut game = GameY::new(2);
        place(&mut game, &[(0,(1,0,0)), (1,(0,1,0)), (0,(0,0,1))]);
        assert!(MinimaxBot::new(2).choose_move(&game).is_none());
    }

    #[test]
    fn test_returned_coords_are_available() {
        let game = GameY::new(4);
        let coords = MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&game).unwrap();
        assert!(game.available_cells().contains(&coords.to_index(game.board_size())));
    }

    #[test]
    fn test_depth_zero_returns_first_available() {
        let game = GameY::new(4);
        let coords = MinimaxBot::new(0).choose_move(&game).unwrap();
        assert_eq!(coords.to_index(game.board_size()), *game.available_cells().first().unwrap());
    }

    // Win / loss detection

    #[test]
    fn test_takes_immediate_win() {
        // p0 has (2,0,0)-(1,0,1): connected chain touching sides b and c.
        // Only (0,0,2) completes the chain to also touch side a.
        // (1,1,0) is the other available cell but does not form a winning chain.
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (2,0,0)), (1, (0,2,0)),
            (0, (1,0,1)), (1, (0,1,1)),
        ]);
        assert_eq!(
            MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&game).unwrap(),
            Coordinates::new(0, 0, 2)
        );
    }

    #[test]
    fn test_blocks_opponent_win() {
        // p1 has (2,0,0)-(1,0,1), one move from winning at (0,0,2).
        // It is p0's turn. Only (0,0,2) blocks; (1,1,0) does not.
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (0,2,0)), (1, (2,0,0)),
            (0, (0,1,1)), (1, (1,0,1)),
        ]);
        assert_eq!(
            MinimaxBot::new(MINIMAX_DEPTH_MEDIUM).choose_move(&game).unwrap(),
            Coordinates::new(0, 0, 2)
        );
    }

    // Score constants

    #[test]
    fn test_win_score_positive()  { assert!(WIN_SCORE > 0); }

    #[test]
    fn test_loss_score_negative() { assert!(LOSS_SCORE < 0); }

    #[test]
    fn test_win_loss_symmetric()  { assert_eq!(WIN_SCORE, -LOSS_SCORE); }

    // minimax internals 

    #[test]
    fn test_minimax_finished_board_win() {
        // (2,0,0)-(1,0,1)-(0,0,2): connected chain touching all three sides
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (2,0,0)), (1, (0,2,0)),
            (0, (1,0,1)), (1, (0,1,1)),
            (0, (0,0,2)),
        ]);
        assert!(game.check_game_over());
        assert_eq!(minimax(&game, 4, i32::MIN, i32::MAX, false, PlayerId::new(0)), WIN_SCORE);
    }

    #[test]
    fn test_minimax_finished_board_loss() {
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (2,0,0)), (1, (0,2,0)),
            (0, (1,0,1)), (1, (0,1,1)),
            (0, (0,0,2)),
        ]);
        assert!(game.check_game_over());
        assert_eq!(minimax(&game, 4, i32::MIN, i32::MAX, false, PlayerId::new(1)), LOSS_SCORE);
    }

    #[test]
    fn test_minimax_depth_zero_returns_draw() {
        //Depth 0 always returns 0
        let game = GameY::new(4);
        assert_eq!(minimax(&game, 0, i32::MIN, i32::MAX, true, PlayerId::new(0)), 0);
    }

    #[test]
    fn test_minimax_score_bounded() {
        let game = GameY::new(3);
        let score = minimax(&game, 2, i32::MIN, i32::MAX, true, PlayerId::new(0));
        assert!(score >= LOSS_SCORE && score <= WIN_SCORE);
    }

    #[test]
    fn test_minimax_deterministic() {
        let mut game = GameY::new(3);
        place(&mut game, &[(0,(2,0,0)), (1,(0,2,0))]);
        assert_eq!(
            MinimaxBot::new(2).choose_move(&game),
            MinimaxBot::new(2).choose_move(&game)
        );
    }
}