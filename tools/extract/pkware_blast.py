"""Pure-Python PKWARE DCL (implode/explode) decoder.

Algorithm ported from Mark Adler's zlib-licensed blast.c. This module is used
only to expand legacy resource containers during static analysis.
"""
from __future__ import annotations

MAXBITS=13
MAX_DISTANCE_BITS=(4,5,6)

class BlastError(ValueError): pass

class _BitReader:
    def __init__(self,data:bytes): self.data=data; self.position=0; self.bit_buffer=0; self.bit_count=0
    def read(self,count:int)->int:
        if count==0:return 0
        while self.bit_count<count:
            if self.position>=len(self.data): raise BlastError('PKWARE stream ended while reading bits')
            self.bit_buffer|=self.data[self.position]<<self.bit_count; self.position+=1; self.bit_count+=8
        value=self.bit_buffer&((1<<count)-1); self.bit_buffer>>=count; self.bit_count-=count; return value

class _Huffman:
    def __init__(self,count,symbols): self.count=count;self.symbols=symbols

def _construct(compacted):
    lengths=[]
    for packed in compacted: lengths.extend([packed&15]*((packed>>4)+1))
    if any(v>MAXBITS for v in lengths): raise BlastError('PKWARE Huffman code length exceeds MAXBITS')
    count=[0]*(MAXBITS+1)
    for v in lengths: count[v]+=1
    if count[0]==len(lengths): return _Huffman(count,[])
    left=1
    for length in range(1,MAXBITS+1):
        left=(left<<1)-count[length]
        if left<0: raise BlastError('over-subscribed PKWARE Huffman code')
    offsets=[0]*(MAXBITS+1)
    for length in range(1,MAXBITS): offsets[length+1]=offsets[length]+count[length]
    symbols=[0]*sum(count)
    for symbol,length in enumerate(lengths):
        if length: symbols[offsets[length]]=symbol; offsets[length]+=1
    return _Huffman(count,symbols)

def _decode(reader,huffman):
    length=1;code=0;first=0;index=0;bit_buffer=reader.bit_buffer;bits_left=reader.bit_count
    while True:
        while bits_left:
            code|=(bit_buffer&1)^1;bit_buffer>>=1;bits_left-=1;count=huffman.count[length]
            if code<first+count:
                reader.bit_buffer=bit_buffer;reader.bit_count=(reader.bit_count-length)&7
                si=index+code-first
                if si>=len(huffman.symbols): raise BlastError('invalid PKWARE Huffman symbol')
                return huffman.symbols[si]
            index+=count;first=(first+count)<<1;code<<=1;length+=1
        remaining=(MAXBITS+1)-length
        if remaining==0: raise BlastError('incomplete PKWARE Huffman code')
        if reader.position>=len(reader.data): raise BlastError('PKWARE stream ended in Huffman code')
        bit_buffer=reader.data[reader.position];reader.position+=1;bits_left=min(remaining,8)

_LITERAL_LENGTHS=(11,124,8,7,28,7,188,13,76,4,10,8,12,10,12,10,8,23,8,9,7,6,7,8,7,6,55,8,23,24,12,11,7,9,11,12,6,7,22,5,7,24,6,11,9,6,7,22,7,11,38,7,9,8,25,11,8,11,9,12,8,12,5,38,5,38,5,11,7,5,6,21,6,10,53,8,7,24,10,27,44,253,253,253,252,252,252,13,12,45,12,45,12,61,12,45,44,173)
_LENGTH_LENGTHS=(2,35,36,53,38,23)
_DISTANCE_LENGTHS=(2,20,53,230,247,151,248)
_LENGTH_BASE=(3,2,4,5,6,7,8,9,10,12,16,24,40,72,136,264)
_LENGTH_EXTRA=(0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8)

def blast(data:bytes)->bytes:
    reader=_BitReader(data); literal_coded=reader.read(8)
    if literal_coded not in (0,1): raise BlastError(f'invalid PKWARE literal flag {literal_coded}')
    dictionary_bits=reader.read(8)
    if dictionary_bits not in MAX_DISTANCE_BITS: raise BlastError(f'invalid PKWARE dictionary size {dictionary_bits}')
    literal_code=_construct(_LITERAL_LENGTHS);length_code=_construct(_LENGTH_LENGTHS);distance_code=_construct(_DISTANCE_LENGTHS)
    out=bytearray()
    while True:
        if reader.read(1):
            symbol=_decode(reader,length_code)
            if not 0<=symbol<len(_LENGTH_BASE): raise BlastError('invalid PKWARE length symbol')
            length=_LENGTH_BASE[symbol]+reader.read(_LENGTH_EXTRA[symbol])
            if length==519: break
            distance_bits=2 if length==2 else dictionary_bits
            ds=_decode(reader,distance_code);distance=(ds<<distance_bits)+reader.read(distance_bits)+1
            if distance>len(out): raise BlastError('PKWARE distance points before output')
            for _ in range(length): out.append(out[-distance])
        else:
            symbol=_decode(reader,literal_code) if literal_coded else reader.read(8)
            if not 0<=symbol<=255: raise BlastError('invalid PKWARE literal')
            out.append(symbol)
    return bytes(out)
