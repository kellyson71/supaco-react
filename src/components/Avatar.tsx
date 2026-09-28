import { useEu } from '../lib/data';
import { photoUrl } from '../lib/suap';
import { cx, Shape } from './ui';
import { Link } from './Link';

export function Avatar({ size = 40, link = true, className }: { size?: number; link?: boolean; className?: string }) {
  const { data: eu } = useEu();
  const inner = eu?.foto ? (
    <img src={photoUrl(eu.foto)} alt="" className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <Shape shape="cookie" size={size} className={cx('text-tertiary-container', className)}>
      <span className="font-semibold text-on-tertiary-container" style={{ fontSize: size * 0.42 }}>{eu?.nome_usual?.[0] ?? ''}</span>
    </Shape>
  );
  return link ? <Link to="/voce" label="Seu perfil" className="shrink-0 rounded-full p-1">{inner}</Link> : inner;
}
