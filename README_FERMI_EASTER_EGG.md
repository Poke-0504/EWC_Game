# 🥚 Fermi Easter Egg Setup

## How to activate the special Fermi theme:

1. **Place the image file:**
   - Add `fermi.jpg` in the same directory as `single-player.html`
   - The image should be square or it will be stretched to fit the circular ball

2. **Activate the Easter egg:**
   - Enter the name: `amba_fermi` (case insensitive)
   - The game will automatically detect and load the image

3. **What happens:**
   - Ball gets 1000 initial mass (huge advantage!)
   - Ball uses fermi.jpg as the texture/theme
   - Golden VIP effects still apply (golden border, aura, crown)
   - Semi-transparent gold overlay blends with the image

4. **Troubleshooting:**
   - If image doesn't load, check browser console for errors
   - Make sure `fermi.jpg` is in the correct directory
   - Image will fall back to golden theme if loading fails
   - Supported formats: JPG, PNG, GIF, WebP

## Technical Details:
- Image is clipped to circular shape automatically
- Scales with ball size (larger balls = larger image)
- Combines with golden VIP effects for ultimate prestige
- Console logging shows image load status

Enjoy your special Fermi-themed dominance! 👑🖼️ 