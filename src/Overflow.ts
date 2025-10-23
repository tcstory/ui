// @ts-nocheck

import {
    ColorSource,
    Container,
    DestroyOptions,
    FederatedPointerEvent,
    Graphics,
    Optional,
    Point,
    Size,
    Ticker,
} from 'pixi.js';
import { Trackpad } from './utils/trackpad/Trackpad';

export type OverflowOptions = {
    width: number;
    height: number;
    background?: ColorSource;
};

export class Overflow extends Container
{
    protected background: Graphics;
    protected borderMask: Graphics;
    protected lastWidth: number;
    protected lastHeight: number;
    protected __width = 0;
    protected __height = 0;
    protected _dimensionChanged = false;

    protected list: any;

    protected _trackpad: Trackpad;
    protected isDragging = 0;
    protected ticker = Ticker.shared;
    protected options: OverflowOptions;
    protected onMouseScrollBinding = this.onMouseScroll.bind(this);
    protected dragStarTouchPoint: Point;
    protected isOver = false;

    protected lastScrollX!: number | null;
    protected lastScrollY!: number | null;

    protected startX = 0;
    protected startY = 0;
    protected endX = 0;
    protected endY = 0;
    protected direction = "";

    constructor(options?: OverflowOptions)
    {
        super();

        if (options)
        {
            this.init(options);
        }

        this.ticker.add(this.update, this);
    }

    init(options: OverflowOptions)
    {
        this.options = options;
        this.setBackground(options.background);

        this.__width = options.width | this.background.width;
        this.__height = options.height | this.background.height;


        if (!this.list)
        {
            this.list = new Container()

            super.addChild(this.list);
        }

        if (this.hasBounds)
        {
            this.addMask();
            this.makeScrollable();
        }

        this._trackpad.xAxis.value = 0;
        this._trackpad.yAxis.value = 0;

        this.resize();
    }

    protected get hasBounds(): boolean
    {
        return !!this.__width || !!this.__height;
    }

    addItem(item: any)
    {
        const child = item

        child.eventMode = 'static';

        this.list.addChild(item)

        this.resize();
    }
    removeItem() {
        this.list.removeChildren();
    }

    setBackground(background?: ColorSource)
    {
        if (this.background)
        {
            this.removeChild(this.background);
        }

        this.options.background = background;

        this.background = new Graphics();

        this.addChildAt(this.background, 0);

        this.resize();
    }

    protected addMask()
    {
        if (!this.borderMask)
        {
            this.borderMask = new Graphics();
            super.addChild(this.borderMask);
            this.mask = this.borderMask;
        }

        this.resize();
    }

    protected makeScrollable()
    {
        if (!this._trackpad)
        {
            this._trackpad = new Trackpad({
                disableEasing: false
            });
        }

        this.on('pointerdown', (e: FederatedPointerEvent) =>
        {
            this.startX = e.x
            this.startY = e.y

            this.isDragging = 1;
            this.dragStarTouchPoint = this.worldTransform.applyInverse(e.global);

            this._trackpad.pointerDown(this.dragStarTouchPoint);
        });

        this.on('pointerup', () =>
        {
            this.isDragging = 0;
            this._trackpad.pointerUp();

        });

        this.on('pointerover', () =>
        {
            this.isOver = true;
        });

        this.on('pointerout', () =>
        {
            this.isOver = false;
        });

        this.on('pointerupoutside', () =>
        {
            this.isDragging = 0;
            this._trackpad.pointerUp();
        });

        this.on('globalpointermove', (e: FederatedPointerEvent) =>
        {
            if (!this.isDragging) return;

            this.endX = e.x;
            this.endY = e.y;

            const touchPoint = this.worldTransform.applyInverse(e.global);

            if (this.dragStarTouchPoint)
            {
                const dragTrashHold = 10;

                const type = this.setDirection()

                if (type === 'horizontal')
                {
                    const xDist = touchPoint.x - this.dragStarTouchPoint.x;

                    if (Math.abs(xDist) > dragTrashHold)
                    {
                        this.isDragging = 2;
                    }
                }
                else if (type === 'vertical')
                {
                    const yDist = touchPoint.y - this.dragStarTouchPoint.y;

                    if (Math.abs(yDist) > dragTrashHold)
                    {
                        this.isDragging = 2;
                    }
                }
            }

            if (this.dragStarTouchPoint && this.isDragging !== 2) return;

            this._trackpad.pointerMove(touchPoint);
        });

        document && document.addEventListener('wheel', this.onMouseScrollBinding, true);
    }

    protected setInteractive()
    {
        this.eventMode = 'static'
    }

    resize(force = false): void
    {
        if (!this.hasBounds) return;


        if (
            this.borderMask
            && (force
                || this._dimensionChanged
                || this.lastWidth !== this.list.width
                || this.lastHeight !== this.list.height)
        )
        {
            if (!this.options.width)
            {
                this.__width += this.list.width;
            }

            if (!this.options.height)
            {
                this.__height += this.list.height;
            }

            this.borderMask
                .clear()
                .roundRect(
                    0,
                    0,
                    this.__width,
                    this.__height,
                    0,
                )
                .fill(0xff00ff)
                .stroke(0x0);
            this.borderMask.eventMode = 'none';

            const color = this.options.background;

            this.background
                .clear()
                .roundRect(
                    0,
                    0,
                    this.__width,
                    this.__height,
                    0,
                )
                .fill({
                    color: color ?? 0x000000,
                    alpha: color ? 1 : 0.0000001, // if color is not set, set alpha to 0 to be able to drag by click on bg
                });

            this.setInteractive();

            this.lastWidth = this.list.width;
            this.lastHeight = this.list.height;
        }

        if (this._trackpad)
        {
            if (this.list.width > this.borderMask.width) {
                this._trackpad.xAxis.max = 0 - (this.list.width - this.borderMask.width);
            } else {
                this._trackpad.xAxis.max = 0
            }


            if (this.list.height > this.borderMask.height) {
                this._trackpad.yAxis.max = 0 - (this.list.height - this.borderMask.height);
            } else {
                this._trackpad.yAxis.max = 0
            }

        }

        if (this._dimensionChanged)
        {
            this._dimensionChanged = false;
        }

        this.lastScrollX = null;
        this.lastScrollY = null;
    }

    protected onMouseScroll(event: WheelEvent): void
    {
        if (!this.isOver) return;


        const targetPos = this.list.y - event.deltaY;

        if (this.list.height < this.__height)
        {
            this._trackpad.yAxis.value = 0;
        }
        else
        {
            const min = this.__height - this.list.height;
            const max = 0;

            this._trackpad.yAxis.value = Math.min(max, Math.max(min, targetPos));
        }

    }


    /** Makes it scroll up to the first element. */
    scrollTop()
    {
        this._trackpad.xAxis.value = 0;
        this._trackpad.yAxis.value = 0;
    }

    /** Gets component height. */
    override get height(): number
    {
        return this.__height;
    }

    override set height(value: number)
    {
        this.__height = value;
        this._dimensionChanged = true;
        this.resize();
        this.scrollTop();
    }

    /** Gets component width. */
    override get width(): number
    {
        return this.__width;
    }

    override set width(value: number)
    {
        this.__width = value;
        this._dimensionChanged = true;
        this.resize();
        this.scrollTop();
    }

    override setSize(value: number | Optional<Size, 'height'>, height?: number): void
    {
        if (typeof value === 'object')
        {
            height = value.height ?? value.width;
            value = value.width;
        }
        else
        {
            height = height ?? value;
        }

        this.__width = value;
        this.__height = height;
        this._dimensionChanged = true;
        this.resize();
        this.scrollTop();
    }

    override getSize(out?: Size): Size
    {
        out = out || { width: 0, height: 0 };
        out.width = this.__width;
        out.height = this.__height;

        return out;
    }

    /** Gets the current raw scroll position on the x-axis (Negated Value). */
    get scrollX(): number
    {
        return this._trackpad.xAxis.value;
    }

    /** Sets the current raw scroll position on the x-axis (Negated Value). */
    set scrollX(value: number)
    {
        this._trackpad.xAxis.value = value;
    }

    /** Gets the current raw scroll position on the y-axis (Negated Value). */
    get scrollY(): number
    {
        return this._trackpad.yAxis.value;
    }

    /** Sets the current raw scroll position on the y-axis (Negated Value). */
    set scrollY(value: number)
    {
        this._trackpad.yAxis.value = value;
    }

    private setDirection() {
        if (this.isDragging) {
            const dx = this.endX - this.startX;
            const dy = this.endY - this.startY;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction =  'horizontal'
            } else {
                this.direction =  'vertical'
            }

            return this.direction
        }

        return this.direction
    }

    protected update()
    {
        if (!this.list) return;

        this._trackpad.update();

        const type = this.direction === 'horizontal' ? 'x' : 'y';

        if (this.list[type] !== this._trackpad[type])
        {
            this.list[type] = this._trackpad[type];
        }
    }

    /**
     * Destroys the component.
     * @param {boolean | DestroyOptions} [options] - Options parameter.
     * A boolean will act as if all options have been set to that value
     */
    override destroy(options?: DestroyOptions | boolean)
    {
        this.ticker.remove(this.update, this);

        document && document.removeEventListener('wheel', this.onMouseScrollBinding, true);

        this.background.destroy();
        this.list.destroy();

        super.destroy(options);
    }

    get scrollHeight(): number
    {
        return this.list.height;
    }

    get scrollWidth(): number
    {
        return this.list.width;
    }
}
