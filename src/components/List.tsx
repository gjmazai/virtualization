import { FC, useCallback, useRef, useState } from 'react';
import { faker } from '@faker-js/faker';

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
const items: TItem[] = Array.from({ length: 10_000 }, (_, __) => ({
	id: Math.random().toString(36).slice(2),
	text: faker.lorem.text(),
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

	const { virtualItems, totalHeight, isScrolling, measureElement } = useFixedSizeList({
		estimateItemHeight: useCallback(() => 40, []),
		getItemKey: useCallback(index => listItems[index]!.id, [listItems]),
		getScrollElement: useCallback(() => scrollElementRef.current, []),
		itemCount: listItems.length,
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
								ref={measureElement}
								data-index={virtualItem.index}
								key={item.id}
								style={{
									padding: '6px 12px',
									position: 'absolute',
									top: 0,
									transform: `translateY(${virtualItem.offsetTop}px)`,
								}}
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
