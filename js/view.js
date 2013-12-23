(function( R ){
    'use strict';
    var View = function( cfg ){
            R.apply( this, cfg );
            this.initLayout();
            this.attachEvents();
            this.step = 0;
            this.gap = [ 0, 9 ];
            this.scrollTop = 0;
            this.blink = 0;
            //this.cellSize = R.sprites.cellSize;
        },
        sprites = R.sprites;

    View.prototype = {
        cellSize: 32,
        set: function( key, value ){
            this[ key ] = value;
            this[key+'Set'] && this[key+'Set'](value);
            this.redrawHud( key, value );
        },
        mapColorsSet: function( data ){
            R.sprites.modifyColors( data );
            this.lastColors = data;
            this.legendCtx.fillStyle = this.lastColors[4];
            this.legendCtx.fillRect(0,0,512,64);
            this.renderTo.style.background = this.lastColors[4];
        },
        scroll: function(  ){
            var y = this.controller.robbo.y,
                gap = this.gap,
                originalGap = [gap[0],gap[1]];//,
                //animateGap = this.animateGap = gap.slice();
            if( y < gap[0] + 2 ){
                if( gap[0] > 0 ){
                    gap[0]-=3;
                    gap[1]-=3;
                }
                if( gap[0] < 0 ){
                    gap[1] -= gap[0];
                    gap[0] = 0;
                }
                !this.animation && this.animateScroll();
            }else if( y > gap[1] - 2 ){
                if( gap[1] < this.controller.map.length ){
                    gap[0]+=3;
                    gap[1]+=3;
                }
                if( gap[1] >= this.controller.map.length ){
                    gap[0] -= gap[1] - this.controller.map.length;
                    gap[1] -= gap[1] - this.controller.map.length;
                }
                !this.animation && this.animateScroll();
            }
            if( !this.controller.scrolled && originalGap[0] === gap[0] ){
                this.controller.scrolled = true;
                this.controller.robbo.scrolled = true;
                this.controller.fire('scrolled');
            }

        },
        animateScroll: function(  ){
            this.animation = true;
            var delta = this.gap[0]*this.cellSize - this.scrollTop;
            if( Math.abs( delta ) < 10  ){
                this.scrollTop = ( this.canvasHolder.scrollTop += delta );
                this.animation = false;
            }else{
                this.scrollTop = ( this.canvasHolder.scrollTop += R.sign( delta ) * this.cellSize/4 );
                window.setTimeout( this.animateScroll.bind(this), 800 / 20 );
            }

        },
        redrawHud: function( name, value ){
            var x = {screw: 1, ammo: 4, keys: 7, lives: 10, planet: 13}[name];
            if(!x)return;
            this.legendCtx.fillStyle = this.lastColors[4];
            this.legendCtx.fillRect(
                x*32,
                20,
                32,32
            );
            this.legendCtx.fillStyle = '#fff';
            this.legendCtx.fillText(
                value,
                x*32+10,
                40
            );
        },
        updateHud: function(  ){
            var c = 2, cellSize = this.cellSize;

            'screw,ammo,keys,lives,planet'.split(',').forEach(function( key ){
                sprites.draw(
                    this.legendCtx,
                    sprites.resolveSprite( {type: 'hud.' + key } ),
                    [ cellSize*c, cellSize/2, cellSize, cellSize ]
                );
                c += 3;
                this.redrawHud( key, this[ key ] );
            }.bind(this) )
        },
        attachEvents: function(  ){
            this.controller.on( 'gameSet', this.set, this );
            this.controller.on( 'robboSet', this.set, this );
            this.controller.on( 'kill', function(){
                this.controller.playSound('kill');
            }, this );
            this.controller.on( 'screwsCollected', function(){
                if( !this.controller.screwsCollected ){
                    this.controller.screwsCollected = true;
                    this.controller.playSound('capsule');
                    this.blink = 3;
                }
            }, this );
        },
        initLayout: function(  ){

            this.canvas = document.createElement('canvas');


            this.canvas.setAttribute('width', 32*16+'');
            this.canvas.setAttribute('height', 32*31+'');
            this.canvas.style.background = '#eee';
            this.canvasCtx = this.canvas.getContext('2d');

            this.canvasHolder = document.createElement('div');

            this.legend = document.createElement('canvas');
            this.legend.setAttribute('width', 32*16+'');
            this.legend.setAttribute('height', 32*2+'');
            this.legendCtx = this.legend.getContext('2d');

            this.legend.style.background = '#888';

            this.canvasHolder.appendChild( this.canvas );
            R.apply( this.canvasHolder.style, {
                height: 32*10 + 4 + 'px',
                width: 32*16 + 'px',
                overflow: 'hidden'
            });
            this.renderTo.innerHTML = '';
            this.renderTo.style.padding = '48px 96px';
            this.renderTo.style.display = 'inline-block';
            this.renderTo.appendChild( this.canvasHolder );
            this.renderTo.appendChild( this.legend );
        },
        redraw: function( obj ){
            var x = obj.x,
                y = obj.y,
                yHash = this.changes[ y ] || (this.changes[ y ] = {});
            yHash[x] = obj;
            obj.lastSprite = false;
        },
        clear: function(  ){
            this.changes = {};
            R.apply( this, {
                screw: 0,
                ammo: 0,
                keys: 0,
                lives: 0,
                planet: 0
            })
        },
        _drawObject: function( obj, sprite ){
            var cellSize = this.cellSize;

            sprites.draw(
                this.canvasCtx,
                sprite,
                [
                    obj.x * cellSize,
                    obj.y * cellSize,
                    cellSize,
                    cellSize
                ],
                this.blink === 2 ? '#fff' : void 0
            );

        },
        drawObject: function( obj ){
            if( obj === false )return;
            var sprite = sprites.resolveSprite( obj, this.step % 8 > 3 ? 1 : 0, this.step ),
                hash = sprites.getHash( sprite );
            if( !obj.lastSprite || obj.lastSprite !== sprites.getHash( sprite ) || this.blink ){
                !obj.dead && this._drawObject( obj, sprite );
                obj.lastSprite = hash;
            }
        },
        fullRedraw: function(  ){
            var map = this.controller.map, mapRow, i, j;
            for( i in map )
                if( map.hasOwnProperty( i ) )
                    for( j in (mapRow = map[ i ] ) )
                        if( mapRow.hasOwnProperty( j ) )
                            this.drawObject( mapRow[ j ] );
        },
        _fullRedraw: function(  ){
            var map = this.controller.map, mapRow, i, j;
            for( i in map )
                if( map.hasOwnProperty( i ) )
                    for( j in (mapRow = map[ i ] ) )
                        if( mapRow.hasOwnProperty( j ) ){
                            mapRow[ j ].lastSprite = false;
                            this.drawObject( mapRow[ j ] );
                        }
        },
        drawChanges: function( animateStep ){
            if( !animateStep ){
                this.step++;
                //120 % 2, 3, 4, 5, 6, 8, 12, 15, 20, 24, 30, 40, 60 === 0, so it would cover all animations that we need
                this.step === 120 && (this.step = 0);
            }

            var drawObject = this.drawObject.bind(this),
                i, j, changeRow,
                changes = this.changes,
                changeCounter = 0;
            if( this.blink ){
                this.blink--;
                this.fullRedraw();
            }else{
                this.controller.actionObjects.forEach( drawObject );

                for( i in changes )
                    if( changes.hasOwnProperty( i ) )
                        for( j in ( changeRow = changes[ i ] ) )
                            if( changeRow.hasOwnProperty( j ) ){
                                this.drawObject( changeRow[ j ] );
                                changeCounter++;
                            }
            }
            this.changes = {};

            this.scroll();

        }
    };
    R.View = View;
    R.loaded('view');
} )(window.R);