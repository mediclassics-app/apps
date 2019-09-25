CodeMirror.defineSimpleMode("simplemode", {
  
    // log: 160211 이정현
    // The start state contains the rules that are intially used
    start: [
        { regex: /\/\/.*/, token: "comment" },  //주석부분

        { regex: /\/\*/, token: "comment", next: "comment" },  //??next의 역할이 뭔지 잘 모르겠음(next: string //When a next property is present, the mode will transfer to the state named by the property when the token is encountered.)

        { regex: /\(\((OR|KO|EN|AK)\)\)/, token: "atom", sol: true },  //콘텐츠라벨

        { regex: /(\(\(LV\)\))(\t)([A-Z][A-Z0-9])/,
          token: ["atom", null, "string"], sol: true },  //콘텐츠라벨 중 레벨

        { regex: /(\[.+?\])(\t)(\(\(.+?\)\))?(.*)/,
          token: ["atom", null, "keyword", null], sol: true },  //의미분류라벨과 키워드

        { regex: /(\{)(.*?)([\:=])(.+?)(\})/,
          token: ["tag", "variable", "operator", "string", "tag"] },  //역자주, 교감기

        { regex: /(【)(.+?)(】)/,
          token: ["tag", null, "tag"] },  //파자표현

        { regex: /(<)(\w+?)(>)/,
          token: ["tag", "tag", "tag"] },  //이미지태그, 이탤릭태그

        { regex: /(\[)(ip|lg|sm|ps|ng)(\/)?(.+?)(\])/,
          token: ["tag", "tag", "tag", null, "tag"] },  //스타일태그

        { regex: /\{n\}/, token: "variable" },  //개행문자 {n}

        { regex: /([ ]+)?(\t)([ ]+)?/, token: ["error", null, "error"] },  //탭문자 앞뒤의 공백에러 표시

        { regex: /\*|@|=|&|★/, token: "atom" },   //특수문자 강조

/*
        { regex: /<<.+?>>/, token: "link" },   //서적표시는 우선 제외
        { regex: /ㆍ|,|\.|!|\?/, token: "operator" }  //
*/

    ],
    
    // The multi-line comment state.
    comment: [
        {regex: /.*?\*\//, token: "comment", next: "start"},
        {regex: /.*/, token: "comment"}

    ],
      // The meta property contains global information about the mode. It
      // can contain properties like lineComment, which are supported by
      // all modes, and also directives like dontIndentStates, which are
      // specific to simple modes.
    meta: {
        dontIndentStates: ["comment"],
        lineComment: "//"
    }
});
