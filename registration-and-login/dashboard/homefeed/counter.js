export function setupCounter(element) {
  let counter = 0;

  const setCounter = (count) => {
    counter = count;
    element.textContent = `count is ${counter}`;
  };

  const onClick = () => setCounter(counter + 1);

  element.addEventListener('click', onClick);

  setCounter(0);

  // Возвращаем функцию для возможного снятия слушателя
  return () => element.removeEventListener('click', onClick);
}