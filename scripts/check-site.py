from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
import json,xml.etree.ElementTree as ET
r=Path(__file__).resolve().parents[1];origin='https://www.nicvaligi.com'
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.links=[];self.images=[];self.metas={};self.canonical=[];self.alternate={};self.ids=set();self.h1=0;self.title='';self.in_head=False;self.in_title=False;self.in_json=False;self.json=[];self.buf='';self.lang=''
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='html':self.lang=a.get('lang')
  if t=='h1':self.h1+=1
  if t=='head':self.in_head=True
  if t=='title' and self.in_head:self.in_title=True
  if 'id' in a:assert a['id'] not in self.ids,('duplicate id',a['id']);self.ids.add(a['id'])
  if t=='a' and 'href' in a:self.links.append(a['href'])
  if t=='img':self.images.append(a);assert a.get('alt'),('missing alt',a);assert a.get('width') and a.get('height'),('missing dimensions',a)
  if t in ['img','source'] and a.get('srcset'):self.links.extend(x.strip().split()[0] for x in a['srcset'].split(','))
  if t=='meta':self.metas[a.get('name',a.get('property',''))]=a.get('content')
  if t=='link':
   if a.get('rel')=='canonical':self.canonical.append(a['href'])
   if a.get('rel')=='alternate':self.alternate[a.get('hreflang')]=a.get('href')
   if a.get('rel') in ['stylesheet','icon','preload','manifest']:self.links.append(a.get('href',''))
  if t=='script':
   if a.get('src'):self.links.append(a['src'])
   if a.get('type')=='application/ld+json':self.in_json=True;self.buf=''
 def handle_data(self,d):
  if self.in_title:self.title+=d
  if self.in_json:self.buf+=d
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
  if t=='head':self.in_head=False
  if t=='script' and self.in_json:self.json.append(json.loads(self.buf));self.in_json=False
paths=['index.html','en/index.html','rilievi-drone.html','en/drone-surveys.html','competenze.html','en/skills.html','ora.html','en/now.html','privacy.html','en/privacy.html']
parsed={}
def canonical_path(f):return '/' if f=='index.html' else '/en/' if f=='en/index.html' else '/'+f
for f in paths:
 p=Page();p.feed((r/f).read_text());parsed[canonical_path(f)]=p
titles=set()
for path,p in parsed.items():
 assert p.h1==1,(path,'h1 count',p.h1)
 assert p.title not in titles; titles.add(p.title)
 assert 15<=len(p.title)<=75,(path,'title length',len(p.title))
 assert 70<=len(p.metas.get('description',''))<=180,(path,'description length')
 assert p.canonical==[origin+path],(path,'canonical')
 assert 'noindex' not in p.metas['robots'] and 'max-image-preview:large' in p.metas['robots']
 assert len(p.json)==1 and p.json[0]['@context']=='https://schema.org',(path,'JSON-LD')
 assert {'it','en','x-default'}==set(p.alternate),(path,'hreflang')
 for lang,dest in p.alternate.items():
  q=parsed[urlsplit(dest).path];assert q.alternate==p.alternate,(path,'hreflang reciprocity')
 for key in ['og:title','og:description','og:image','og:image:alt','twitter:title','twitter:description']:assert p.metas.get(key),(path,key)
 for link in p.links+[x['src'] for x in p.images]:
  url=urlsplit(urljoin(origin+path,link))
  if url.netloc!='www.nicvaligi.com':continue
  local=unquote(url.path).lstrip('/');local=(local+'index.html') if not local or local.endswith('/') else local
  assert (r/local).is_file(),(path,'missing resource',link,local)
  if url.fragment and url.path in parsed:assert url.fragment in parsed[url.path].ids,(path,'broken anchor',link)
 print(path, 'OK',len(p.title),'title chars;',len(p.metas['description']),'description chars')
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'};sm=ET.parse(r/'sitemap.xml');urls=[e.text for e in sm.findall('s:url/s:loc',ns)]
assert set(urls)=={origin+p for p in parsed};assert len(urls)==len(set(urls))
assert 'Sitemap: '+origin+'/sitemap.xml' in (r/'robots.txt').read_text()
assert 'noindex' not in (r/'robots.txt').read_text()
print('PASS:',len(parsed),'pages; unique metadata, one H1, reciprocal language links, valid JSON-LD, local resources, anchors and sitemap.')
