import type { CSSProperties } from 'react';

type SkeletonProps = { className?: string; style?: CSSProperties };

function Block({className = '', style}: SkeletonProps) {
  return <span aria-hidden="true" className={`jf-skeleton-block ${className}`} style={style}/>;
}

export function SkeletonAvatar({size = 48}: {size?: number}) {
  return <Block className="jf-skeleton-avatar" style={{width:size,height:size,flexBasis:size}}/>;
}

export function SkeletonCard() {
  return (
    <article className="jf-skeleton-card" aria-hidden="true">
      <div className="jf-skeleton-card-heading"><SkeletonAvatar size={40}/><div><Block style={{width:'42%'}}/><Block style={{width:'76%',height:18}}/></div></div>
      <Block style={{width:'100%'}}/><Block style={{width:'88%'}}/><Block style={{width:'54%',height:12}}/>
    </article>
  );
}

export function SkeletonList({count = 3}: {count?: number}) {
  return <div className="jf-skeleton-list" role="status" aria-label="Cargando contenido">{Array.from({length:count},(_,index)=><SkeletonCard key={index}/>)}</div>;
}

export function SkeletonPodium() {
  return (
    <section className="jf-skeleton-podium" role="status" aria-label="Cargando clasificación">
      <div className="jf-skeleton-podium-grid">
        {[0,1,2].map((item)=><div className="jf-skeleton-podium-card" key={item}><SkeletonAvatar size={52}/><Block style={{width:'72%'}}/><Block style={{width:'42%'}}/><Block style={{width:'100%',height:item===0?104:78}}/></div>)}
      </div>
      <SkeletonList count={2}/>
    </section>
  );
}
