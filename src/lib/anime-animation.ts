import { animate, stagger } from "animejs";

/**
 * High-performance lag-free anime animations using anime.js
 * Hardware accelerated using transform and opacity
 */

export function animateCardStagger(selector: string | HTMLElement[]) {
  try {
    animate(selector, {
      translateY: [20, 0],
      opacity: [0, 1],
      scale: [0.97, 1],
      delay: stagger(30, { start: 40 }),
      duration: 450,
      ease: "outCubic",
    });
  } catch (err) {
    console.warn("Anime.js card stagger error:", err);
  }
}

export function animatePulseEffect(element: HTMLElement) {
  try {
    animate(element, {
      scale: [1, 1.06, 1],
      duration: 320,
      ease: "inOutQuad",
    });
  } catch (err) {
    console.warn("Anime.js pulse error:", err);
  }
}

export function animateModalEntrance(element: HTMLElement) {
  try {
    animate(element, {
      scale: [0.93, 1],
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 320,
      ease: "outCubic",
    });
  } catch (err) {
    console.warn("Anime.js modal error:", err);
  }
}

export function animateBadgeGlow(element: HTMLElement) {
  try {
    animate(element, {
      scale: [1, 1.15, 1],
      duration: 380,
      ease: "outBack",
    });
  } catch (err) {
    console.warn("Anime.js glow error:", err);
  }
}
