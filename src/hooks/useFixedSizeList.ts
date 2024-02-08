import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

/** Тип описывающий пропсы. */
type THookProps = {
	/** количество всех элементов. */
	itemCount: number;
	/** Высота одного элемента. */
	getItemHeight?: ( index: number ) => number;
	/** Количество элементов накладываемая плюсом к отображаемым. */
	overscan: number;
	/** Задержка при скроллинге в милисекундах. */
	scrollingDelay: number;
	/** Функция возвращающая ссылку на элемент. */
	getScrollElement: () => HTMLElement | null;
	/** Функция вычисляющая примерную высоту. */
	estimateItemHeight?: ( index: number ) => number;
	/** Функция возвращающая актуальный ключ элемента. */
	getItemKey: ( index: number ) => TKey;
};

/** Ключ записи. */
type TKey = string | number;

/** Тип описывающий виртуальный элемент. */
type TVurtualItem = {
	index: number;
	offsetTop: number;
	height: number;
};

/** Функция валидации пропсов. */
function validationProps( props: THookProps ) {
	const { getItemHeight, estimateItemHeight } = props;

	if( !getItemHeight && !estimateItemHeight ) {
		throw new Error( 'Не передано ни одной функции для возвращения высоты элемента.' );
	}
}

export function useFixedSizeList( props: THookProps ) {
	/** Сначала валидируем пропсы. */
	validationProps( props );
	const {
		itemCount,
		getItemHeight,
		overscan,
		scrollingDelay,
		getScrollElement,
		estimateItemHeight,
		getItemKey
	} = props;

	const [ measerumentCache, setMeaserumentCache ] = useState<Record<TKey, number>>({});
	/** Высота видимого списка. */
	const [listHeight, setListHeight] = useState(0);
	/** Количество пикселей от вершины списка до видимой вершины. */
	const [scrollTop, setScrollTop] = useState(0);
	/** Флаг того, что пользователь использует скролл. */
	const [isScrolling, setIsScrolling] = useState(false);

	/** Нужен для подписи через resize observer, чтобы отслеживать высоту. */
	useLayoutEffect(() => {
		const scrollElement = getScrollElement();

		if( !scrollElement ) {
			return;
		}

		const resizeObserver = new ResizeObserver(([entry]) => {
			if( !entry ) {
				return;
			}

			/**
			 * Получение высоты.
			 * Используется именно оператор "??", т.к. высота равная нулю является приемлемым значением.
			 */
			const height = entry?.borderBoxSize[ 0 ]?.blockSize ?? entry?.target.getBoundingClientRect().height;
			setListHeight( height );
		});

		/** Подписываемся на наблюдение элемента для которого используется скролл. */
		resizeObserver.observe( scrollElement );

		/** Очищаение обзервера. */
		return () => resizeObserver.disconnect();

	}, [getScrollElement]);

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

		scrollElement.addEventListener( 'scroll', handleScroll );
		return () => {
			if ( typeof timeoutId === 'number' ) {
				clearTimeout( timeoutId );
			}
			scrollElement.removeEventListener( 'scroll', handleScroll );
		};
	}, []);

	const { virtualItems, startIndex, endIndex, allItems, totalHeight } = useMemo(() => {
		
		/** Функция возвращающая высоту элемента. */
		const getItemHeightByIndex = (index: number) => {
			if( getItemHeight ) {
				return getItemHeight(index);
			}
			const key = getItemKey( index );
			if( typeof measerumentCache[ key ] === 'number' ) {
				return measerumentCache[ key ]!;
			}
			return estimateItemHeight!(index);
		}

		const rangeStart = scrollTop;
		const rangeEnd = scrollTop + listHeight;

		let totalHeight = 0,
			startIndex = -1,
			endIndex = -1;
		const allItems = Array( itemCount );

		for ( let index = 0; index < itemCount; index++ ) {
			const key = getItemKey( index );
			const row = {
				key,
				index: index,
				height: getItemHeightByIndex( index ),
				offsetTop: totalHeight
			};
			totalHeight += row.height;
			allItems[ index ] = row;

			if( startIndex === -1 && row.offsetTop + row.height > rangeStart ) {
				startIndex = Math.max( index, index - overscan );
			}

			if( endIndex === -1 && row.offsetTop + row.height >= rangeEnd ) {
				endIndex = Math.min( itemCount - 1, index + overscan );
			}
		}

		const virtualItems: TVurtualItem[] = allItems.slice( startIndex, endIndex + 1 );

		return { virtualItems, startIndex, endIndex, allItems, totalHeight };

	}, [ scrollTop, overscan, getItemHeight, estimateItemHeight, measerumentCache, itemCount ]);

	const measureElement = useCallback(( element: Element | null ) => {
		if( !element ) {
			return;
		}
		const indexAttribute = element?.getAttribute('data-index') || '';
		const index = parseInt( indexAttribute, 10 );
		if( Number.isNaN(index) ) {
			console.error('индекс элемента NaN');
			return;
		}

		const size = element?.getBoundingClientRect();
		const  key = getItemKey( index );

		setMeaserumentCache( cache => ({...cache, [key ]: size.height }));
	}, []);

	return {
		virtualItems,
		totalHeight,
		startIndex,
		endIndex,
		allItems,
		isScrolling,
		measureElement
	};
}