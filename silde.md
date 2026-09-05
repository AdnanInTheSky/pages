## ARROW BUTTON CONTROL — ADD THIS

Add **Previous** and **Next** arrow buttons to the card fan.

The arrows must control which existing card becomes the center.

### CRITICAL RULE

**NO CARD MAY DISAPPEAR.**

Do NOT implement a conventional carousel where:

```text
card exits → disappears → new card appears
```

Instead:

```text
all existing cards remain visible
        ↓
arrow clicked
        ↓
fan positions are recalculated
        ↓
a different existing card smoothly moves to center
        ↓
all other existing cards rearrange around it
```

The complete set of cards must remain rendered at all times.

Do NOT use:

* `visibleCards.splice()`
* synthetic card IDs
* removing cards from the DOM
* `x-if` for cards
* destroying/recreating cards
* opacity `0` to hide cards during normal navigation
* sliding-window pagination

Use the permanent `x-for` rendering architecture already implemented.

---

# 1. NEXT ARROW

Add a left/right arrow control around the card fan.

Clicking **Next** should:

```javascript
selectedIndex = (selectedIndex + 1) % cards.length;
```

Then recalculate the fan.

Example with 5 cards:

### Initial

```text
       [1]   [2]   [3]   [4]   [5]
                    ↑
                 CENTER
```

Click Next:

```text
       [1]   [2]   [3]   [4]   [5]
                          ↑
                       CENTER
```

Card 4 must physically move from its current position to the center.

Cards 1, 2, 3, and 5 must simultaneously reposition around it.

**None of them disappear.**

---

# 2. PREVIOUS ARROW

Clicking Previous:

```javascript
selectedIndex =
    (selectedIndex - 1 + cards.length) % cards.length;
```

Example:

```text
Before:

       [1]   [2]   [3]   [4]   [5]
                          ↑
                       CENTER


Previous:

       [1]   [2]   [3]   [4]   [5]
                    ↑
                 CENTER
```

Again:

**Every card remains visible.**

---

# 3. FAN REPOSITIONING

The fan is centered around `selectedIndex`.

Do NOT assume the center is always the middle array element.

Instead calculate each card's relative position:

```javascript
let diff = index - selectedIndex;
```

For circular navigation, normalize the difference so the closest route around the fan is used.

For example with 7 cards:

```text
selectedIndex = 0

        [6] [5] [4] [0] [1] [2] [3]
                       ↑
                    CENTER
```

The cards should be arranged according to their distance from the selected card.

The selected card gets:

```text
x: 0
y: -1.5rem
rotation: 0deg
scale: 1.05
zIndex: 40
opacity: 1
```

Cards immediately beside it receive smaller scale and outward rotation.

---

# 4. CIRCULAR POSITION CALCULATION

Use circular distance.

For example:

```javascript
function getRelativeDiff(index, selectedIndex, total) {
    let diff = index - selectedIndex;

    if (diff > total / 2) {
        diff -= total;
    }

    if (diff < -total / 2) {
        diff += total;
    }

    return diff;
}
```

This means the fan always uses the nearest cards around the selected card.

For example, with 7 cards and card 1 selected:

```text
        Card 5  Card 6  Card 7  Card 1  Card 2  Card 3  Card 4
                              CENTER
```

Do not let the cards suddenly jump from one side to the other.

---

# 5. ALL CARDS MUST ANIMATE

When an arrow is clicked, animate **every visible card** from its current position to its new position.

For example:

```javascript
gsap.to(card, {
    x: targetX,
    y: targetY,
    rotation: targetRotation,
    scale: targetScale,
    zIndex: targetZ,
    opacity: 1,
    duration: 0.6,
    ease: "power3.out",
    overwrite: "auto"
});
```

The animation should feel like the physical deck is rotating/reorganizing.

Do NOT animate only the selected card.

The entire fan should respond.

---

# 6. DO NOT USE ENTER/EXIT ANIMATION FOR ARROW NAVIGATION

Arrow navigation is NOT a page transition.

Therefore do not do:

```text
old card → exit screen
new card → enter screen
```

Instead:

```text
CURRENT FAN
     ↓
all cards move
     ↓
NEW FAN
```

Every card remains inside the fan container.

Every card remains visible.

---

# 7. EDGE CARDS

If there are 4 cards:

```text
[1] [2] [3] [4]
```

all 4 must remain visible.

If there are 3:

```text
[1] [2] [3]
```

all 3 remain visible.

If there are 2:

```text
[1] [2]
```

both remain visible.

If there is 1:

```text
[1]
```

disable the arrows because there is nothing to navigate.

Do NOT create additional cards to fill the fan.

---

# 8. MORE THAN 7 CARDS

If a slide contains more than 7 cards, the maximum visible fan size may be 7.

However, do NOT remove cards from the DOM.

All cards should remain rendered, while cards outside the active 7-card fan may be positioned outside the primary visible area.

When an arrow is clicked, the next card should smoothly move into the fan.

The important distinction is:

**Do not destroy/recreate cards.**

Use permanent DOM elements and animate their positions.

If an off-fan card needs to enter the visible fan, animate it from its off-fan position into the appropriate fan slot.

---

# 9. ARROW APPEARANCE

Use two circular glass-style buttons:

```text
             [ CARD FAN ]

        ◀                 ▶
```

Style:

* circular
* approximately 44–52px
* translucent/glass background
* backdrop blur
* subtle border
* subtle shadow
* hover scale: approximately 1.08
* active scale: approximately 0.95
* smooth transition

Use inline SVG chevron icons.

Do not use icon libraries.

---

# 10. ARROW POSITION

The buttons should not cover the important content of the cards.

Desktop:

```text
       ◀     [ CARD FAN ]     ▶
```

Mobile:

```text
       [ CARD FAN ]

       ◀           ▶
```

Position them responsively.

Make them large enough for touch interaction.

---

# 11. ARROW + CLICK MUST SHARE THE SAME STATE

There must be ONE source of truth:

```javascript
selectedIndex
```

Arrow:

```javascript
nextCard()
previousCard()
```

Card click:

```javascript
selectCard(index)
```

Dot click:

```javascript
selectCard(index)
```

All three must ultimately update:

```javascript
selectedIndex
```

Then call the same fan-positioning function.

Do NOT create separate animation logic for:

* arrows
* cards
* dots

They must all use the same positioning engine.

---

# 12. HOVER MUST NOT OVERRIDE ARROW SELECTION

Hover remains temporary.

Example:

```text
selectedIndex = 3
```

means card 4 is the selected center.

If the user moves their mouse over card 6:

```text
hoveredIndex = 5
selectedIndex = 3
```

Card 6 can receive a small hover effect, but **card 4 remains the selected center**.

Hover must never silently change `selectedIndex`.

---

# 13. ARROW ANIMATION LOCK

Prevent accidental rapid-fire transitions.

Use:

```javascript
isAnimating
```

But do NOT make the interface feel frozen.

If the user clicks while animating, either:

1. ignore the click until the animation finishes, OR
2. preferably queue one next/previous action.

Do not allow multiple GSAP animations to fight each other.

Use:

```javascript
overwrite: "auto"
```

where appropriate.

---

# 14. KEYBOARD CONTROL

The fan container should support:

```text
ArrowLeft  → previousCard()
ArrowRight → nextCard()
```

Also:

```text
Home → first card
End  → last card
```

Make the container keyboard accessible.

---

# 15. VISUAL RESULT

The interaction should feel like a physical deck being rotated:

```text
INITIAL

        \   \   [3]   /   /
                  ↑
               CENTER


NEXT

        \   \   [4]   /   /
                  ↑
               CENTER


NEXT

        \   \   [5]   /   /
                  ↑
               CENTER


PREVIOUS

        \   \   [4]   /   /
                  ↑
               CENTER
```

The cards are **not being replaced**.

They are the same cards continuously moving between fan positions.

---

# 16. FINAL VERIFICATION

After implementation, inspect the actual code and verify:

* [ ] Previous arrow exists
* [ ] Next arrow exists
* [ ] Both arrows work
* [ ] Clicking Next changes `selectedIndex`
* [ ] Clicking Previous changes `selectedIndex`
* [ ] Card click changes `selectedIndex`
* [ ] Dot click changes `selectedIndex`
* [ ] Keyboard arrows work
* [ ] All existing cards remain rendered
* [ ] No cards are removed during navigation
* [ ] No cards are recreated during navigation
* [ ] No card disappears/fades out during normal arrow navigation
* [ ] Every card smoothly changes position
* [ ] New selected card moves to center
* [ ] Other cards rearrange around it
* [ ] Fan rotation is preserved
* [ ] z-index is recalculated
* [ ] Mobile controls work
* [ ] 1–7 card layouts work correctly
* [ ] 8+ cards use the same permanent-DOM architecture

The final behavior must be a **controllable physical fan of cards**, where arrows, dots, and card clicks all select the center card, while the complete set of existing cards remains persistent and the fan continuously rearranges itself.
