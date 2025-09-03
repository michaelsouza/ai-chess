# Chess Mastery ♔

A beautiful, modern chess game built with vanilla HTML, CSS, and JavaScript. Features a stunning glass morphism design, full chess rule implementation, and smooth gameplay experience.

## ✨ Features

### 🎮 Complete Chess Implementation
- **Full chess rules** including castling, en passant, and pawn promotion
- **Legal move validation** with check/checkmate detection
- **Undo functionality** to take back moves
- **Game state detection** (check, checkmate, stalemate)

### ⏱️ Time Management
- **Multiple time controls**: 5, 10, or 30 minutes per player
- **Live countdown timers** with automatic game ending on timeout
- **Timer starts** automatically with the first move

### 🎨 Modern Design
- **Glass morphism UI** with beautiful gradients and blur effects
- **Responsive design** that works on desktop, tablet, and mobile
- **Smooth animations** and hover effects
- **Professional typography** using Inter font family
- **Traditional chess board** with proper light/dark square alternation
- **Distinct piece colors** - white pieces in white, black pieces in dark gray

### ⚡ Performance Optimized
- **Move caching** for faster legal move calculation
- **Efficient DOM manipulation** using document fragments
- **Click debouncing** to prevent accidental double-clicks
- **Optimized state management** without expensive deep cloning

## 🛠️ Technologies Used

- **HTML5** - Semantic structure and accessibility
- **CSS3** - Advanced styling with gradients, backdrop filters, and animations
- **Vanilla JavaScript** - Pure ES6+ without external dependencies
- **CSS Grid & Flexbox** - Modern layout techniques
- **Google Fonts** - Inter font family for professional typography

## 🎯 Game Mechanics

### Chess Rules Implemented
- ✅ **Piece Movement** - All standard piece moves (pawn, rook, knight, bishop, queen, king)
- ✅ **Special Moves** - Castling (kingside and queenside), en passant capture
- ✅ **Pawn Promotion** - Interactive modal for piece selection
- ✅ **Check Detection** - Highlights when king is in check
- ✅ **Legal Move Filtering** - Only shows moves that don't leave king in check
- ✅ **Game End Conditions** - Checkmate, stalemate, timeout

### User Interface
- **Visual Move Indicators** - Green dots for legal moves, red highlights for captures
- **Selected Piece Highlighting** - Yellow highlight for currently selected piece
- **Player Timers** - Distinct styling for white (light) and black (dark) players
- **Real-time Status** - Current player turn and game state information
- **Responsive Layout** - Adapts to different screen sizes seamlessly

## 🚀 How to Play

1. **Start the Game** - Open `index.html` in any modern web browser
2. **Set Time Control** - Choose between 5, 10, or 30-minute games
3. **Make Moves** - Click a piece to select it, then click a highlighted square to move
4. **Special Features**:
   - **New Game** - Reset the board at any time
   - **Undo Move** - Take back the last move made
   - **Pawn Promotion** - Choose your piece when a pawn reaches the end

## 🎨 Design Philosophy

The interface follows modern web design principles:
- **Glass Morphism** - Translucent elements with blur effects
- **Gradient Backgrounds** - Beautiful purple-to-slate color schemes
- **Micro-interactions** - Subtle hover effects and transitions
- **Accessibility** - High contrast, readable fonts, and semantic HTML
- **Mobile-First** - Responsive design that scales beautifully

## 🏗️ Architecture

- **Component-based Structure** - Modular JavaScript functions for different game aspects
- **State Management** - Centralized game state with efficient updates
- **Event-Driven** - Clean separation between UI events and game logic
- **Performance Focused** - Caching and optimization for smooth gameplay

## 📱 Browser Support

Works in all modern browsers including:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

*Built with ❤️ using modern web technologies for the ultimate chess experience.*
