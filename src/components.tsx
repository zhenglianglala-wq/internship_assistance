import {useEffect,useRef,type ReactNode} from 'react';
import {ArrowUpRight,Check,ChevronRight,ExternalLink,LoaderCircle,Plus,X} from 'lucide-react';
import type {Application,Color} from './types';

export function Logo({company,small=false}:{company:Pick<Application,'logo'|'color'>;small?:boolean}){return <span className={`company-logo ${company.color} ${small?'small':''}`} aria-hidden="true">{company.logo}</span>}
export function Tag({children,color='gray'}:{children:ReactNode;color?:Color|'gray'}){return <span className={`tag ${color}`}>{children}</span>}
export function Empty({icon:Icon=Plus,title,children,action}:{icon?:typeof Plus;title:string;children?:ReactNode;action?:ReactNode}){return <div className="empty"><div className="empty-icon"><Icon size={28}/></div><h3>{title}</h3><p>{children}</p>{action}</div>}
export function Spinner({text='加载中…'}:{text?:string}){return <div className="loading" role="status"><LoaderCircle className="spin" size={20}/>{text}</div>}
export function SectionTitle({eyebrow,title,children}:{eyebrow?:string;title:string;children?:ReactNode}){return <div className="page-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div><div className="heading-actions">{children}</div></div>}
export function PanelTitle({title,subtitle,children}:{title:string;subtitle?:string;children?:ReactNode}){return <div className="panel-title"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{children}</div>}
export function TextLink({children,onClick}:{children:ReactNode;onClick:()=>void}){return <button className="text-link" onClick={onClick}>{children}<ChevronRight size={15}/></button>}
export function External({url,children}:{url:string;children:ReactNode}){return <a className="text-link" href={url} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={15}/></a>}
export function BusyButton({busy,children,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{busy?:boolean}){return <button {...props} disabled={props.disabled||busy}>{busy?<LoaderCircle size={16} className="spin"/>:null}{children}</button>}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const dialog=ref.current!,previous=document.activeElement as HTMLElement|null;
  const fit=()=>{const zoom=Number.parseFloat(getComputedStyle(document.documentElement).zoom)||1;dialog.style.setProperty('--dialog-vh',`${window.innerHeight/zoom}px`);dialog.style.setProperty('--dialog-vw',`${window.innerWidth/zoom}px`)};
  fit();const observer=new MutationObserver(fit);observer.observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});window.addEventListener('resize',fit);dialog.showModal();dialog.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')?.focus();return()=>{observer.disconnect();window.removeEventListener('resize',fit);dialog.close();if(previous?.isConnected)previous.focus()}},[]);
 return <dialog ref={ref} className={`modal ${wide?'wide':''}`} aria-labelledby="modal-title" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="关闭对话框" onClick={onClose}><X size={19}/></button></div>{children}</dialog>
}
export function CheckMark(){return <span className="check-mark"><Check size={13}/></span>}
export {ExternalLink};
