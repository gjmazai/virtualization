import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

/** Тип описывающий пропсы. */
type THookProps = {
	/** количество всех элементов. */
	itemCount: number;
	/** Высота одного элемента. */
	itemHeight: number;
	/** Высота контейнера. */
	containerHeight: number;
	/** Количество элементов накладываемая плюсом к отображаемым. */
	overscan: number;
	/** Задержка при скроллинге в милисекундах. */
	scrollingDelay: number;
	/** Функция возвращающая ссылку на элемент. */
	getScrollElement: () => HTMLElement | null; 
};

/** Тип описывающий виртуальный элемент. */
type TVurtualItem = {
	index: number;
	offsetTop: number;
};

export function useFixedSizeList(props: THookProps) {
	const {
		itemCount,
		itemHeight,
		containerHeight,
		overscan,
		scrollingDelay,
		getScrollElement
	} = props;

	const [scrollTop, setScrollTop] = useState(0);
	const [isScrolling, setIsScrolling] = useState(false);

	/** Нужно использовать именно этот эффект, а не useEffect из-за ограничений синхронизации (при useEffect будет блиц\ моргание экрана). */
	useLayoutEffect(() => {
		/** Получаем элемент. */
		const scrollElement = getScrollElement();
		/** Если нет элемента, то уходим. */
		if (!scrollElement) {
			return;
		}

		/** Функция обрабатывающая скролл. */
		const handleScroll = () => {
			/** Количество пикселей от самого верхнего содержимого до самого верхнего видимого содержимого. */
			const scrollLenghtFromTop = scrollElement.scrollTop;

			/** Устанавливаем новое значение. */
			setScrollTop(scrollLenghtFromTop);
		};

		/** Необходимый первый вызов для синхронизации, возможно браузер\приложение сохранил положение скролла. */
		handleScroll();

		scrollElement.addEventListener('scroll', handleScroll);
		return () => scrollElement.removeEventListener('scroll', handleScroll);
	}, [getScrollElement]);

	useEffect(() => {
		/** Получаем элемент. */
		const scrollElement = getScrollElement();
		/** Если нет элемента, то уходим. */
		if (!scrollElement) {
			return;
		}

		let timeoutId: number | null = null;

		/** Функция обрабатывающая скролл. */
		const handleScroll = () => {
			setIsScrolling(true);

			if (typeof timeoutId === 'number') {
				clearTimeout(timeoutId);
			}

			/** Для снятия флага. */
			timeoutId = setTimeout(() => {
				setIsScrolling(false);
			}, scrollingDelay);
		};

		/** Необходимый первый вызов для синхронизации, возможно браузер\приложение сохранил положение скролла. */
		handleScroll();

		scrollElement.addEventListener('scroll', handleScroll);
		return () => {
			if (typeof timeoutId === 'number') {
				clearTimeout(timeoutId);
			}
			scrollElement.removeEventListener('scroll', handleScroll);
		};
	}, []);

	const { virtualItems, startIndex, endIndex } = useMemo(() => {
		const rangeStart = scrollTop;
		const rangeEnd = scrollTop + containerHeight;

		/** Округление вниз, чтобы пол элемента отрендерить с начала скролла. */
		let startIndex = Math.floor(rangeStart / itemHeight);
		/** Обратное округление. */
		let endIndex = Math.ceil(rangeEnd / itemHeight);

		/** Оверскан может отправить индекс в отрицательную сторону. */
		startIndex = Math.max(0, startIndex - overscan);
		endIndex = Math.min(itemCount - 1, endIndex + overscan);

		const virtualItems: TVurtualItem[] = [];

		for (let index = startIndex; index <= endIndex; index++) {
			virtualItems.push({
				index: index,
				offsetTop: index * itemHeight,
			});
		}

		return { virtualItems, startIndex, endIndex };
	}, [scrollTop, itemHeight, itemCount]);

	const totalHeight = itemHeight * itemCount;

	return {
		virtualItems,
		totalHeight,
		startIndex,
		endIndex,
		isScrolling
	};
}