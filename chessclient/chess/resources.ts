const INTRO_HTML=`
<h1>Chess playing interface of ACT Discord Server</h1>

<p>
Provides an opportunity to play variant Promotion Atomic online.
</p>

<br>

<p>
The site is under construction.
</p>
`

const PROMOTION_ATOMIC_RULES_HTML=`
<h1>Rules of variant Promotion Atomic</h1>

<p>
The rules are the same as of variant Atomic, except that on every non pawn move you can:
</p>

<ul>
    <li>promote the piece incrementally B -&gt; N -&gt; R -&gt; Q</li>
    or
    <li>underpromote the piece decrementally Q -&gt; R -&gt; N -&gt; B</li>
    or
    <li>leave the piece unchanged</li>
</ul>

<p>
You can promote pawns as follows:
<ul>
    <li>5th rank -> P , B</li>    
    <li>6th rank -> P , B , N</li>
    <li>7th rank -> P , B , N , R</li>
    <li>8th rank -> B , N , R , Q ( usual promotion )</li>
</ul>
</p>

<p>
On castling you can promote the rook.
</p>

<p>
Promotion to or from king is not possible.
</p>
`