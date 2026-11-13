import { useLayoutEffect } from 'react';

const sections = [
  '.about-hero-copy', '.about-device', '.about-description > h2', '.about-description-intro',
  '.about-feature', '.about-cycle-inner > h2', '.about-cycle-intro', '.about-cycle-diagram',
  '.about-application-copy', '.about-sensor', '.about-prototype', '.about-specification-card',
  '.about-footer > div',
].join(', ');

export default function useSectionReveal(pageRef) {
  useLayoutEffect(() => {
    const page = pageRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!page || motion.matches || !('IntersectionObserver' in window)) return;

    const blocks = [...page.querySelectorAll(sections)];
    const reveal = block => {
      block.classList.remove('is-pending');
      observer.unobserve(block);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

    blocks.forEach(block => {
      if (block.matches('.about-feature, .about-sensor')) {
        const index = [...block.parentElement.children].indexOf(block);
        block.style.setProperty('--reveal-delay', `${Math.min(index, 2) * 80}ms`);
      }
      block.classList.add('about-reveal', 'is-pending');
      observer.observe(block);
    });

    // Keyboard navigation and reduced-motion changes must always expose the content.
    const onFocus = event => {
      const block = event.target.closest('.about-reveal.is-pending');
      if (block) reveal(block);
    };
    const onMotionChange = () => { if (motion.matches) blocks.forEach(reveal); };
    page.addEventListener('focusin', onFocus);
    motion.addEventListener('change', onMotionChange);
    return () => {
      observer.disconnect();
      page.removeEventListener('focusin', onFocus);
      motion.removeEventListener('change', onMotionChange);
      blocks.forEach(block => {
        block.classList.remove('about-reveal', 'is-pending');
        block.style.removeProperty('--reveal-delay');
      });
    };
  }, [pageRef]);
}
