/**
 * Interactive Physical Card Fan Animation Engine
 * GSAP 3.12.5 + Alpine.js CDN Architecture
 * 
 * Implements full specification from silde.md:
 * - Arrow Button Navigation (Previous & Next)
 * - Persistent DOM rendering: NO cards are ever removed or destroyed
 * - Circular position calculation via getRelativeDiff()
 * - Single source of truth: selectedIndex
 * - Temporary hover lift that never overrides selectedIndex
 * - Smooth GSAP power3.out fan repositioning
 * - Desktop flank arrows + Mobile bottom arrows
 * - Full keyboard accessibility (ArrowLeft, ArrowRight, Home, End)
 * - Queued animation lock preventing stuck clicks
 */

function getResponsiveMultiplier(width) {
    if (width < 480) return 0.30;
    if (width < 640) return 0.45;
    if (width < 768) return 0.65;
    if (width < 1024) return 0.85;
    return 1.0;
}

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

function cardFanSlider(config) {
    return {
        items: config.items || [],
        theme: config.theme || 'light',
        totalItems: (config.items || []).length,
        selectedIndex: Math.floor(((config.items || []).length - 1) / 2),
        hoveredIndex: null,
        isAnimating: false,
        queuedAction: null,
        animTimer: null,
        rootEl: null,
        touchStartX: 0,
        touchStartY: 0,
        hasEntered: false,

        get activeCenterIndex() {
            return this.selectedIndex;
        },

        get multiplier() {
            return getResponsiveMultiplier(typeof window !== 'undefined' ? (window.innerWidth || 1200) : 1200);
        },

        get heightMultiplier() {
            const m = this.multiplier;
            return Math.min(1.0, Math.max(0.45, m));
        },

        get prefersReducedMotion() {
            return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        init() {
            this.rootEl = this.$root || (this.$el && this.$el.closest ? this.$el.closest('[x-data]') : this.$el);
            if (!this.totalItems && this.items && this.items.length) {
                this.totalItems = this.items.length;
                this.selectedIndex = Math.floor((this.totalItems - 1) / 2);
            }
            if (this.totalItems === 0) return;

            // Wait for Alpine DOM stamping
            this.$nextTick(() => {
                this.runEntrance();
            });

            // Debounced window resize handler
            let resizeTimer;
            if (typeof window !== 'undefined') {
                window.addEventListener('resize', () => {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(() => {
                        this.repositionFan(0.3);
                    }, 100);
                });
            }
        },

        getRootEl() {
            if (this.rootEl && this.rootEl.querySelector) {
                return this.rootEl;
            }
            if (this.$root && this.$root.querySelector) {
                this.rootEl = this.$root;
                return this.rootEl;
            }
            if (this.$el) {
                const closest = this.$el.closest ? this.$el.closest('[x-data]') : null;
                if (closest && closest.querySelector) {
                    this.rootEl = closest;
                    return this.rootEl;
                }
            }
            return typeof document !== 'undefined' ? document : null;
        },

        getCardEl(index) {
            const root = this.getRootEl();
            if (!root || typeof root.querySelector !== 'function') return null;
            return root.querySelector(`[data-index="${index}"]`) || 
                   (root.querySelectorAll ? root.querySelectorAll('.card-fan-item')[index] : null) || 
                   null;
        },

        getSlotTransform(diff) {
            const multiplier = this.multiplier;
            const heightMultiplier = this.heightMultiplier;
            const reduced = this.prefersReducedMotion;
            const sign = diff < 0 ? -1 : (diff > 0 ? 1 : 0);
            const absD = Math.abs(diff);

            if (absD === 0) {
                return {
                    x: 0,
                    y: -1.5 * heightMultiplier,
                    rot: 0,
                    scale: 1.05,
                    zIndex: 40,
                    opacity: 1.0
                };
            }

            return {
                x: sign * (13.5 + (absD - 1) * 11.5) * multiplier,
                y: (absD * 1.5 + (absD - 1) * 1.2) * heightMultiplier,
                rot: reduced ? 0 : sign * (9 + (absD - 1) * 8),
                scale: Math.max(0.72, 1.0 - absD * 0.08),
                zIndex: Math.max(1, 30 - absD * 5),
                opacity: 1.0
            };
        },

        runEntrance() {
            if (typeof gsap === 'undefined') {
                this.hasEntered = true;
                return;
            }

            const reduced = this.prefersReducedMotion;
            let readyCount = 0;

            for (let i = 0; i < this.totalItems; i++) {
                const el = this.getCardEl(i);
                if (!el) continue;

                readyCount++;
                const diff = getRelativeDiff(i, this.selectedIndex, this.totalItems);
                const tf = this.getSlotTransform(diff);

                if (reduced) {
                    gsap.set(el, {
                        xPercent: -50,
                        yPercent: -50,
                        x: `${tf.x}rem`,
                        y: `${tf.y}rem`,
                        rotation: 0,
                        scale: tf.scale,
                        zIndex: tf.zIndex,
                        opacity: 1,
                        transformOrigin: 'center 85%'
                    });
                } else {
                    gsap.fromTo(el, 
                        {
                            opacity: 0,
                            scale: 0.5,
                            xPercent: -50,
                            yPercent: -50,
                            x: `${tf.x * 0.5}rem`,
                            y: '10rem',
                            rotation: tf.rot * 0.5,
                            transformOrigin: 'center 85%'
                        },
                        {
                            opacity: 1,
                            scale: tf.scale,
                            x: `${tf.x}rem`,
                            y: `${tf.y}rem`,
                            rotation: tf.rot,
                            zIndex: tf.zIndex,
                            duration: 0.85,
                            delay: 0.1 + i * 0.08,
                            ease: 'back.out(1.2)',
                            overwrite: 'auto',
                            onComplete: () => {
                                this.hasEntered = true;
                            }
                        }
                    );
                }
            }

            if (readyCount === 0 && typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(() => this.runEntrance());
            }
        },

        repositionFan(duration = 0.6) {
            if (typeof gsap === 'undefined') return;

            this.isAnimating = true;
            const reduced = this.prefersReducedMotion;
            const actualDuration = reduced ? 0.05 : duration;
            let completed = 0;
            const total = this.totalItems;

            if (this.animTimer) {
                clearTimeout(this.animTimer);
            }
            // Unlock after motion is mostly settled (400ms) to ensure animations never freeze
            this.animTimer = setTimeout(() => {
                this.onAnimationFinished();
            }, Math.max(300, (actualDuration - 0.15) * 1000));

            for (let i = 0; i < total; i++) {
                const el = this.getCardEl(i);
                if (!el) {
                    completed++;
                    if (completed >= total) this.onAnimationFinished();
                    continue;
                }

                const diff = getRelativeDiff(i, this.selectedIndex, total);
                const tf = this.getSlotTransform(diff);

                // Hover extra lift if this card is currently hovered
                if (this.hoveredIndex === i && i !== this.selectedIndex) {
                    tf.y -= 1.8 * this.heightMultiplier;
                    tf.scale *= 1.05;
                    tf.zIndex = 35;
                }

                // If bringing to center, immediately bring forward
                if (diff === 0) {
                    gsap.set(el, { zIndex: tf.zIndex });
                }

                gsap.to(el, {
                    xPercent: -50,
                    yPercent: -50,
                    x: `${tf.x}rem`,
                    y: `${tf.y}rem`,
                    rotation: tf.rot,
                    scale: tf.scale,
                    opacity: 1,
                    duration: actualDuration,
                    ease: reduced ? 'none' : 'power3.out',
                    overwrite: 'auto',
                    onComplete: () => {
                        gsap.set(el, { zIndex: tf.zIndex });
                        completed++;
                        if (completed >= total) {
                            this.onAnimationFinished();
                        }
                    }
                });
            }
        },

        onAnimationFinished() {
            if (this.animTimer) {
                clearTimeout(this.animTimer);
                this.animTimer = null;
            }
            if (!this.isAnimating && !this.queuedAction) return;
            this.isAnimating = false;
            if (this.queuedAction !== null && this.queuedAction !== undefined) {
                const nextAction = this.queuedAction;
                this.queuedAction = null;
                if (nextAction === 'next') {
                    this.nextCard();
                } else if (nextAction === 'prev') {
                    this.previousCard();
                } else if (typeof nextAction === 'number') {
                    this.selectCard(nextAction);
                }
            }
        },

        nextCard() {
            if (this.totalItems <= 1) return;
            if (this.isAnimating) {
                this.queuedAction = 'next';
                return;
            }
            this.selectedIndex = (this.selectedIndex + 1) % this.totalItems;
            this.repositionFan(0.6);
        },

        previousCard() {
            if (this.totalItems <= 1) return;
            if (this.isAnimating) {
                this.queuedAction = 'prev';
                return;
            }
            this.selectedIndex = (this.selectedIndex - 1 + this.totalItems) % this.totalItems;
            this.repositionFan(0.6);
        },

        selectCard(index) {
            if (index === this.selectedIndex || index < 0 || index >= this.totalItems) return;
            if (this.isAnimating) {
                this.queuedAction = index;
                return;
            }
            this.selectedIndex = index;
            this.repositionFan(0.6);
        },

        onCardHover(index) {
            if (this.hoveredIndex === index) return;
            this.hoveredIndex = index;
            this.applyHoverState(index, true);
        },

        onCardLeave(index) {
            if (this.hoveredIndex === index) {
                this.hoveredIndex = null;
                this.applyHoverState(index, false);
            }
        },

        onStageLeave() {
            if (this.hoveredIndex !== null) {
                const prev = this.hoveredIndex;
                this.hoveredIndex = null;
                this.applyHoverState(prev, false);
            }
        },

        applyHoverState(index, isHovering) {
            if (typeof gsap === 'undefined' || index === this.selectedIndex) return;
            const el = this.getCardEl(index);
            if (!el) return;

            const diff = getRelativeDiff(index, this.selectedIndex, this.totalItems);
            const tf = this.getSlotTransform(diff);

            if (isHovering) {
                tf.y -= 1.8 * this.heightMultiplier;
                tf.scale *= 1.05;
                tf.zIndex = 35;
                gsap.set(el, { zIndex: tf.zIndex });
            }

            gsap.to(el, {
                xPercent: -50,
                yPercent: -50,
                x: `${tf.x}rem`,
                y: `${tf.y}rem`,
                scale: tf.scale,
                rotation: tf.rot,
                duration: 0.35,
                ease: 'power2.out',
                overwrite: 'auto',
                onComplete: () => {
                    gsap.set(el, { zIndex: tf.zIndex });
                }
            });
        },

        // Backward compatibility aliases
        next() { this.nextCard(); },
        prev() { this.previousCard(); },
        goTo(index) { this.selectCard(index); },
        setActive(index) { this.selectCard(index); },

        onTouchStart(e) {
            if (!e.touches || e.touches.length === 0) return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        },

        onTouchEnd(e) {
            if (!e.changedTouches || e.changedTouches.length === 0) return;
            const deltaX = e.changedTouches[0].clientX - this.touchStartX;
            const deltaY = e.changedTouches[0].clientY - this.touchStartY;

            if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                if (deltaX < 0) {
                    this.nextCard();
                } else {
                    this.previousCard();
                }
            }
        }
    };
}

// Global exposure
if (typeof window !== 'undefined') {
    window.cardFanSlider = cardFanSlider;
    window.getRelativeDiff = getRelativeDiff;
}
