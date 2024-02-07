import { FC, useCallback, useRef, useState } from 'react';
import { useFixedSizeList } from '../hooks';

/**
 * Реализация:
 * только вертикальная виртуализация с фиксированным размером элементов.
 * overscan - чтобы не было белого пространства
 * isScrolling - флаг того, что идет скролл. нужен чтобы лишний раз не рендерить не нужные элементы.
 */

/** Тип описывающий элемент в списке. */
type TItem = {
	id: string;
	text: string;
};

/** Заполнение массива данными. */
const items: TItem[] = Array.from({ length: 10_000 }, (_, index) => ({
	id: Math.random().toString(36).slice(2),
	text: String(index),
}));

/** Высота элементов. */
const ITEM_HEIGHT = 40;
/** Высота контейнера. */
const CONTAINER_HEIGHT = 600;
/** Дефолтное значение поверх видных элементов. */
const OVERSCAN = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT);
/** Задержка после которой не нужно обновлять скролл. */
const DELAY = 300;

export const List: FC = () => {
	const [listItems, setListItems] = useState<TItem[]>(items);

	const scrollElementRef = useRef<HTMLDivElement>(null);

	const { virtualItems, totalHeight, isScrolling } = useFixedSizeList({
		itemHeight: ITEM_HEIGHT,
		itemCount: listItems.length,
		containerHeight: CONTAINER_HEIGHT,
		getScrollElement: useCallback(() => scrollElementRef.current, []),
		scrollingDelay: DELAY,
		overscan: OVERSCAN,
	});

	return (
		<div style={{ padding: '0 15px' }}>
			<h1>List</h1>
			<div>
				<button
					onClick={event => {
						event.preventDefault();
						setListItems(items => items.reverse());
					}}
				>
					Reverse
				</button>
			</div>
			<div
				ref={scrollElementRef}
				style={{
					height: CONTAINER_HEIGHT,
					overflow: 'auto',
					border: '1px solid grey',
					marginTop: 12,
					position: 'relative',
				}}
			>
				<div style={{ height: totalHeight, width: CONTAINER_HEIGHT }}>
					{virtualItems.map(virtualItem => {
						const item = listItems[virtualItem.index];
						return (
							<div
								style={{
									height: ITEM_HEIGHT,
									padding: '6px 12px',
									position: 'absolute',
									top: 0,
									transform: `translateY(${virtualItem.offsetTop}px)`,
								}}
								key={item.id}
							>
								{isScrolling ? 'Scrolling...' : item.text}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
