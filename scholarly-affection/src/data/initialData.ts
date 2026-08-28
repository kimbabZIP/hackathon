import { Professor, AssignmentRecord, LectureMaterial, LectureVoice, GalleryItem } from '../types';

export const INITIAL_PROFESSORS: Professor[] = [
  {
    id: 'prof-1',
    name: '이태준 교수',
    field: '고전문학',
    title: '동양고전 및 서양문학비평 전공',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCunNdNtQlkQB-G1M8n2-DWZoZbs-EOk1LV-jblK4RwebHF_7sj87xtkiP2HQjfrz3pkbw3GyY6ChpIIIctEw1xVlaQ_PefhxfTKrRnx8JkvkTcwsuFvJyqJzfFzmbPTvUKk5sctOXv0ip-K4ZlpUGH5pDO4Lb_gxTKWgPWYVcAoVDQQp4-QthIu6yKnfSD_0fv8vIk5cA91giPDnrXayXv4om6lMu-D1LAnAnSudjbIetgpyck7913',
    spriteUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Xb-UTM4_RU0AALtvshgnKwHv3HYWnztyVLxPKKu_UMu_OaYJnFLeV3EsiylQVwrLvNVWt2UH6GZNcOEfBssWx5Cbq2zwoeM7M87XNvHTKqh-ULNA33l-xu0QSa0EM0GuSeclzkFvGBI4PeC2z-aj1Sdsyl5Q4JYG8DW0mkbpMgrn8esz1EXPvuKY4VFpBWU95JYYPy9DEODZRGntnVNLDDE6jcrvk7xH-0EIA2UOC8spkDpa15-Kejt1Q',
    bgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKTF9IFICAKAqfPbSoZ35rKaZIonFA_1as5ltp3F7nfZ0gueYOV_QA2MuQ7a2F_r9snTotg1p8Q3Z67czK2kehdCGjoEaikcUxU0NtaJfTv_LqyLO8jKs7knn5QIR4GSgQMgWESk-ObBHVfxyuR-xEM8Oxp1v05Z8c9D3i_XgiPub_DYtr13vF29HkBIm1lbfoPqOxz1zySGUxm93gHxVibonLy-8UPr8vVGxB_I61QBecO7u3UOvK',
    affection: 65,
    stress: 30,
    traits: '엄격하고 철저한 성격. 겉으로는 차갑고 비판적이지만, 학생의 문장 하나하나에 깊은 애정과 학문적 기대를 담고 있다. 만년필로 직접 교정하는 것을 선호함.',
    specialty: '텍스트 원전 비평, 시학, 문맥 분석',
    dialogues: [
      {
        id: 'node-1',
        speaker: '이태준 교수',
        text: '자, 자네의 이번 리포트를 좀 볼까? ...흐음, 도입부의 논리적인 비약이 꽤 심하군. 이리 가까이 와보게.',
        expression: 'strict',
        choices: [
          {
            text: '교수님, 3장의 각주와 비교하며 다시 설명드려도 될까요?',
            nextId: 'node-2',
            affectionDelta: 8,
            stressDelta: -5,
            feedback: '근거를 찾으려는 태도가 마음에 든 모양입니다.'
          },
          {
            text: '죄송합니다... 밤새 쓴 거라 집중력이 흐려졌습니다.',
            nextId: 'node-3',
            affectionDelta: 4,
            stressDelta: -2,
            feedback: '교수님이 안타까운 눈빛으로 차 한 잔을 건넵니다.'
          },
          {
            text: '어느 부분이 부족한지 만년필로 짚어주실 수 있나요?',
            nextId: 'node-4',
            affectionDelta: 10,
            stressDelta: -8,
            feedback: '당신의 학구열에 교수님의 눈가가 부드러워집니다.'
          }
        ]
      },
      {
        id: 'node-2',
        speaker: '이태준 교수',
        text: '호오... 각주 7번을 인용한 근거는 꽤 날카롭군. 다만 결론을 내릴 때 자네만의 목소리가 더 확고해야 해. 내 연구실에 있는 18세기 원전을 함께 읽어보겠나?',
        expression: 'thoughtful',
        choices: [
          {
            text: '네! 교수님 지도라면 주말이라도 기꺼이 참여하겠습니다.',
            nextId: 'node-end-1',
            affectionDelta: 12,
            stressDelta: -10,
            feedback: '교수님이 조용히 미소 짓습니다.'
          },
          {
            text: '원전 라틴어 원문을 제가 번역해와도 괜찮을까요?',
            nextId: 'node-end-1',
            affectionDelta: 15,
            stressDelta: -12,
            feedback: '호감도가 크게 상승했습니다!'
          }
        ]
      },
      {
        id: 'node-3',
        speaker: '이태준 교수',
        text: '학문도 체력이 뒷받침되어야 하는 법이다. 여기 얼그레이 티를 타 두었으니 먼저 마시고 시작하게. 무리하지 말게나.',
        expression: 'smile',
        choices: [
          {
            text: '감사합니다, 교수님. 향이 아주 좋네요.',
            nextId: 'node-end-1',
            affectionDelta: 8,
            stressDelta: -10,
            feedback: '차분한 온기가 연구실을 감쌉니다.'
          }
        ]
      },
      {
        id: 'node-4',
        speaker: '이태준 교수',
        text: '여길 보게. 이 문장의 수식어는 아름답지만 논지를 흐리고 있어. ...하지만 자네가 무엇을 말하려 했는지는 내 마음에 정확히 닿았네.',
        expression: 'smile',
        choices: [
          {
            text: '교수님께 닿았다니... 정말 다행입니다.',
            nextId: 'node-end-1',
            affectionDelta: 14,
            stressDelta: -10,
            feedback: '교수님의 볼이 살짝 붉어졌습니다.'
          }
        ]
      },
      {
        id: 'node-end-1',
        speaker: '이태준 교수',
        text: '좋아. 오늘 교정한 내용을 바탕으로 수정한 초안을 내일 5시까지 가져오게. ...기다리고 있겠네.',
        expression: 'normal'
      }
    ]
  },
  {
    id: 'prof-2',
    name: '윤시우 교수',
    field: '현대예술',
    title: '현대미술사 및 조형예술학 전공',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBValLxpQQ_IU52peZB0xRLHatrHomlSzeGy7YGpKyzqXhLLEATLTTCV4IjzFgvqu6RpZeef_k9QSHcNS3Np97ig4phUB_gY6Di536bJbwV-ZBfKE8XwvnUAIDRdX67yhyCEGoXUhCg23jd8mutPXJNXaFautNP6gp1xnhUzoaaz4TR1sAGjN76tGT2EBfs7MnvwoRfN-sdcSo2WlNceaiTpR80aUKqt8ng2C9uEQNPEBoBCf7QYzOd',
    spriteUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANn4_4OGqXFix3afOMPnwO91ios5HAp7ABAUdqVzEp4_UV5B00rNTKQdvkNpBZuAA5jWeWR4tG4xHtuIKiYzFENOhDU94NS23BWx4zlfcUR55Y47-_INerB3obXGuuMrWBGCaKIkjnjgN3kemKOdLXCHVDppRBdllamTKx2sb5xtgq8vyx4XtYERF8pCWZzkuzMlYPXoSHoDAJJzR_bFfmlhyv-uV89NeNP_CYG-PXt1lOEa-j4TMA',
    bgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6zs87rBJCVqNXcYYteTmtJj5YmOQ5XyXeQAfTGuBIwIkFU5soaUaJPqSnll8OK0KRvPh486NyFWx1GCUuWltMeKNP7KLdPc4aIdiM8uGOuM5jElGfCIaD6FKKljqPoZv67o6tZFJ0bOhCQpXq2k-FDMTcFoF1sUUZQ9IplAcSZxIGwsaUNpC1UjRja-XNHyI00l7WLFm12MrBCenA0RP6mO6RiB3UXIxtpY-nn0Cpo77C_CxhL9i_',
    affection: 72,
    stress: 20,
    traits: '다정하고 섬세한 성품. 학생들의 독창적인 감각과 직관을 존중하며 따뜻한 카디건과 갓 내린 드립 커피를 즐겨 마신다.',
    specialty: '감성 기호학, 시각 예술 비평, 공간 연출',
    dialogues: [
      {
        id: 'node-1',
        speaker: '윤시우 교수',
        text: '어서 와요. 오늘 햇살이 작업실 창가로 참 예쁘게 들어오네요. 자네가 가져온 포트폴리오를 보고 있었어요.',
        expression: 'smile',
        choices: [
          {
            text: '교수님의 지난 전시회 도록에서 많은 영감을 얻었습니다.',
            nextId: 'node-2',
            affectionDelta: 10,
            stressDelta: -8,
            feedback: '윤 교수님이 환하게 웃으며 커피를 내려줍니다.'
          },
          {
            text: '색채 배합이 여전히 불안정한데 조언을 구하고 싶습니다.',
            nextId: 'node-3',
            affectionDelta: 8,
            stressDelta: -5,
            feedback: '성실한 진정성에 감동받았습니다.'
          }
        ]
      },
      {
        id: 'node-2',
        speaker: '윤시우 교수',
        text: '내 작품을 그렇게 깊이 봐주었군요. 특히 캔버스 여백에 머무는 시선이 자네와 닮았다는 생각을 했어요.',
        expression: 'thoughtful',
        choices: [
          {
            text: '교수님과 함께 그림을 논할 수 있어서 늘 행복합니다.',
            nextId: 'node-end-1',
            affectionDelta: 12,
            stressDelta: -10,
            feedback: '호감도가 상승했습니다.'
          }
        ]
      },
      {
        id: 'node-3',
        speaker: '윤시우 교수',
        text: '불안정함 또한 예술의 찬란한 일부랍니다. 자, 여기 붓을 잡고 나와 함께 명암을 덧칠해볼까요?',
        expression: 'smile',
        choices: [
          {
            text: '네, 교수님 손을 따라가 보겠습니다.',
            nextId: 'node-end-1',
            affectionDelta: 14,
            stressDelta: -10,
            feedback: '다정한 지도가 이어집니다.'
          }
        ]
      },
      {
        id: 'node-end-1',
        speaker: '윤시우 교수',
        text: '자네의 감각은 언제나 나에게 새로운 설렘을 주는군요. 다음 주에도 이 시간에 들러줘요.',
        expression: 'smile'
      }
    ]
  },
  {
    id: 'prof-3',
    name: '서유진 교수',
    field: '이론물리학',
    title: '양자역학 및 고에너지물리학 석좌연구원',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ3qODKOPfGAjSWB45WHCcL4VhD-gR3FB8yBwZk1rb0i2gtEKZyhrMf3wBIBOoU89Vu-o8IrJGR3eVqn_WgGM1qEihdMhJt_99eZZJQWm4XAjxks2Yunid66sJwgc4oXcsC6JXXnCLFU0Ls3mZeTcaKMc37acvpQrEo5xyy_ZMHq8w5vYP2omLvfiN3LOSvXa5FD8qJV2oKMN-tynSIoJYr_4DgllWP4rL2TbfGey13tiO5GZdDDmo',
    spriteUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Xb-UTM4_RU0AALtvshgnKwHv3HYWnztyVLxPKKu_UMu_OaYJnFLeV3EsiylQVwrLvNVWt2UH6GZNcOEfBssWx5Cbq2zwoeM7M87XNvHTKqh-ULNA33l-xu0QSa0EM0GuSeclzkFvGBI4PeC2z-aj1Sdsyl5Q4JYG8DW0mkbpMgrn8esz1EXPvuKY4VFpBWU95JYYPy9DEODZRGntnVNLDDE6jcrvk7xH-0EIA2UOC8spkDpa15-Kejt1Q',
    bgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiKTXSOUe-t6PKt6F-58eBObhqsUt2XSbbEsEtfvQRczhMCqvOkQhZMIAYis9J-YdJZEoalFib2JiF0dTtOkkb6Y49aoHo5XjXC9vnEX3lEUdpniyKRoMTBQzIDmk_NxP0Xml8S9xL-XkehK9HzyFCzNgTUFh_X5WadP-5t5XCA4j2Fuh7N1bB81IdiegQ2GNVeNDVImpQqdQaWWAwWwMdk9TwQU8aoW2eCk5iZYwBEdLFICshN0po',
    affection: 55,
    stress: 45,
    traits: '냉철하고 시크한 천재형 물리학자. 수식과 논리의 완결성을 추구하며, 빈틈없는 질문으로 학생을 시험하지만 진정한 이해를 발견했을 때 은은한 긍정을 표함.',
    specialty: '양자 얽힘, 시공간 기하학, 텐서 해석학',
    dialogues: [
      {
        id: 'node-1',
        speaker: '서유진 교수',
        text: '수식 전개 4단계에서 대칭성 보존 증명이 빠져있어. 논문 제출 기한이 얼마 안 남았는데 이 정도 오차를 간과한 건가?',
        expression: 'strict',
        choices: [
          {
            text: '게이지 불변성을 적용해 라그랑지안을 재유도했습니다.',
            nextId: 'node-2',
            affectionDelta: 12,
            stressDelta: -10,
            feedback: '서 교수의 눈빛이 번뜩입니다.'
          },
          {
            text: '교수님 지적대로 텐서 축약 과정에서 실수가 있었습니다.',
            nextId: 'node-3',
            affectionDelta: 7,
            stressDelta: -4,
            feedback: '정직한 인정을 긍정적으로 평가합니다.'
          }
        ]
      },
      {
        id: 'node-2',
        speaker: '서유진 교수',
        text: '...훌륭해. 내 의도를 단번에 파악했군. 칠판 앞으로 와. 공동 저자로 올릴 논문의 다음 장을 함께 풀어나가지.',
        expression: 'smile',
        choices: [
          {
            text: '공동 저자라니... 최선을 다해 검증하겠습니다!',
            nextId: 'node-end-1',
            affectionDelta: 15,
            stressDelta: -15,
            feedback: '호감도가 대폭 상승했습니다.'
          }
        ]
      },
      {
        id: 'node-3',
        speaker: '서유진 교수',
        text: '오류를 인정하는 것도 학자의 미덕이지. 자, 내가 쓴 연습 문제 풀이집을 줄 테니 오늘 밤 안으로 복습해오도록.',
        expression: 'thoughtful',
        choices: [
          {
            text: '교수님의 친필 노트를 소중히 공부하겠습니다.',
            nextId: 'node-end-1',
            affectionDelta: 9,
            stressDelta: -6,
            feedback: '서 교수가 살며시 고개를 끄덕입니다.'
          }
        ]
      },
      {
        id: 'node-end-1',
        speaker: '서유진 교수',
        text: '질문이 생기면 언제든 내 연구실 문을 두드려도 좋아. 자네를 위해 시간은 비워둘 테니까.',
        expression: 'normal'
      }
    ]
  },
  {
    id: 'prof-4',
    name: '강지혁 교수',
    field: '법학 및 미학',
    title: '학술법학 및 지적재산권법 주임교수',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeVI2jiBGdUeB6ttfV6_1SIXp6YDKaz09NHo5DdZAEBGUFQorIoCSuGXRsOcUWhecMfs0i2LxlO8-M9MPmVXi208FUZCRj2GVuAM9-BpT-IH5iCrARIt-8d5hP9YCkMiJCkDQCZI5DU8qCRA7FO-P4tE3i0M4WYefKKCIAmLtERNvdsx_kayabK4Yc1-Ja6gj4iJbu7pny2O5qZiiN7Nd-sNBSd5bwRViJ4NmxNQC1JaKwXl749HG4',
    spriteUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANn4_4OGqXFix3afOMPnwO91ios5HAp7ABAUdqVzEp4_UV5B00rNTKQdvkNpBZuAA5jWeWR4tG4xHtuIKiYzFENOhDU94NS23BWx4zlfcUR55Y47-_INerB3obXGuuMrWBGCaKIkjnjgN3kemKOdLXCHVDppRBdllamTKx2sb5xtgq8vyx4XtYERF8pCWZzkuzMlYPXoSHoDAJJzR_bFfmlhyv-uV89NeNP_CYG-PXt1lOEa-j4TMA',
    bgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiKTXSOUe-t6PKt6F-58eBObhqsUt2XSbbEsEtfvQRczhMCqvOkQhZMIAYis9J-YdJZEoalFib2JiF0dTtOkkb6Y49aoHo5XjXC9vnEX3lEUdpniyKRoMTBQzIDmk_NxP0Xml8S9xL-XkehK9HzyFCzNgTUFh_X5WadP-5t5XCA4j2Fuh7N1bB81IdiegQ2GNVeNDVImpQqdQaWWAwWwMdk9TwQU8aoW2eCk5iZYwBEdLFICshN0po',
    affection: 80,
    stress: 15,
    traits: '카리스마 넘치고 품격 있는 정통파 학자. 반듯한 정장 조끼와 만년필, 학생에 대한 각별한 신뢰와 보호 본능을 지님.',
    specialty: '법철학, 판례 분석, 예술 저작권법',
    dialogues: [
      {
        id: 'node-1',
        speaker: '강지혁 교수',
        text: '자, 자네의 이번 리포트를 좀 볼까? ...흐음, 법리 해석에 대한 통찰은 빼어나나 반대 변론에 대한 대비가 다소 헐겁군. 이리 가까이 와보게.',
        expression: 'strict',
        choices: [
          {
            text: '교수님께서 제시해주신 헌법재판소 판례를 인용해 반박을 보완하겠습니다.',
            nextId: 'node-2',
            affectionDelta: 12,
            stressDelta: -8,
            feedback: '강 교수님이 만족스러운 듯 안경을 고쳐 씁니다.'
          },
          {
            text: '교수님의 세미나 강의 덕분에 이 논점을 파고들 수 있었습니다.',
            nextId: 'node-3',
            affectionDelta: 10,
            stressDelta: -5,
            feedback: '부드러운 미소가 번집니다.'
          }
        ]
      },
      {
        id: 'node-2',
        speaker: '강지혁 교수',
        text: '좋은 태도야. 자네의 그 정연한 문장과 날카로운 시각은 언제 보아도 사람의 마음을 끄는 힘이 있지.',
        expression: 'smile',
        choices: [
          {
            text: '교수님의 칭찬을 들으니 밤샘 연구의 피로가 다 녹아내립니다.',
            nextId: 'node-end-1',
            affectionDelta: 14,
            stressDelta: -12,
            feedback: '강 교수님이 만년필로 별표를 달아줍니다.'
          }
        ]
      },
      {
        id: 'node-3',
        speaker: '강지혁 교수',
        text: '내 강의를 그렇게 열정적으로 들어주는 학생은 자네가 유일해. 앞으로도 내 곁에서 더 깊은 법리를 탐구해주겠나?',
        expression: 'thoughtful',
        choices: [
          {
            text: '평생 교수님의 곁에서 지도를 받고 싶습니다.',
            nextId: 'node-end-1',
            affectionDelta: 16,
            stressDelta: -15,
            feedback: '호감도가 최대치에 가까워졌습니다!'
          }
        ]
      },
      {
        id: 'node-end-1',
        speaker: '강지혁 교수',
        text: '훌륭하군. 다음 주 법학 학술제에 자네와 함께 발제자로 나서도록 준비해두겠네.',
        expression: 'smile'
      }
    ]
  }
];

export const INITIAL_ASSIGNMENTS: AssignmentRecord[] = [
  {
    id: 'asg-1',
    professorId: 'prof-1',
    title: '19세기 문학 속 서정적 자아와 시간 의식에 관한 고찰',
    topic: '고전문학 비평',
    content: '본 연구는 19세기 낭만주의 및 사실주의 문학에 나타난 서정적 자아의 내면화 과정을 시간적 지각 구조의 변천을 중심으로 분석하고자 한다. 텍스트 내에서 과거 회상과 미래 전망이 교차하는 지점은 단순한 플롯의 기법이 아니라 주체의 실존적 불안을 드러내는 상징적 장치로 기능한다...',
    grade: 'A+',
    score: 98,
    summaryFeedback: '원전 텍스트를 대하는 자네의 섬세한 통찰과 논리적 구조화가 매우 빼어나네. 특히 2장의 시간 축 붕괴에 관한 해석은 학회 발표 논문으로 손색이 없을 정도야.',
    annotations: [
      { text: '실존적 불안을 드러내는 상징적 장치', note: '탁월한 개념화. 이 부분을 결론부와 수미상관으로 연결하면 더 완벽할 것.', type: 'praise' },
      { text: '과거 회상과 미래 전망이 교차하는 지점', note: '헤겔의 시간철학과 연계하여 각주를 보강할 것을 권함.', type: 'critique' }
    ],
    timestamp: '2026-08-26 15:30',
    affectionGained: 15
  },
  {
    id: 'asg-2',
    professorId: 'prof-4',
    title: '디지털 창작물에 대한 저작인격권의 확장 가능성 연구',
    topic: '학술법학 및 지적재산권',
    content: '인공지능과 알고리즘에 의해 생성된 예술적 창작물에 대해 전통적인 성명표시권 및 동일성유지권을 어떻게 재구성할 것인가에 대한 법철학적 탐구...',
    grade: 'A',
    score: 95,
    summaryFeedback: '판례의 해석을 현대적 맥락으로 치밀하게 재해석한 명문이네. 붉은 잉크로 몇 군데 가필해 두었으니 확인하게.',
    annotations: [
      { text: '법철학적 탐구', note: '칸트의 인격권 이론과 연결한 지점이 대단히 명쾌함.', type: 'praise' }
    ],
    timestamp: '2026-08-25 11:20',
    affectionGained: 12
  }
];

export const INITIAL_LECTURE_MATERIALS: LectureMaterial[] = [
  {
    id: 'mat-1',
    professorId: 'prof-1',
    title: '제7강: 고전 시학의 수사와 은유 구조',
    fileName: 'Lecture07_Classical_Poetics_Syllabus.pdf',
    fileSize: '4.2 MB',
    summary: '아리스토텔레스 시학에서 현대 기호학으로 이어지는 은유의 지평을 탐구하며, 텍스트가 독자에게 미적 카타르시스를 유발하는 3단계 메커니즘을 규명함.',
    keyQuestions: [
      '은유가 단순한 장식을 넘어 인식의 확장으로 작용하는 순간은 언제인가?',
      '원전 번역 시 발생하는 문화적 간극을 극복하는 주석의 역할은 무엇인가?'
    ],
    professorComment: '이 자료를 읽고 자네의 생각을 한 문장으로 정리해 연구실로 가져오게.',
    timestamp: '2026-08-27 10:00'
  },
  {
    id: 'mat-2',
    professorId: 'prof-4',
    title: '제10강: 현대 예술 판례와 표현의 자유 경계선',
    fileName: 'Seminar10_Art_Jurisprudence_Cases.pdf',
    fileSize: '6.8 MB',
    summary: '대법원 및 유럽인권재판소의 최신 예술 저작권 분쟁 사례를 심층 분석하고, 표현의 자유와 명예권의 비교형량 원칙을 다룸.',
    keyQuestions: [
      '패러디와 저작권 침해의 분기점은 실질적 개작인가 비평성인가?',
      '공공 조형물의 동일성유지권 침해 기준은 어떻게 정립되어야 하는가?'
    ],
    professorComment: '자네의 탁월한 변론 논리가 기대되는 주제로 준비해보았네.',
    timestamp: '2026-08-27 14:15'
  }
];

export const INITIAL_LECTURE_VOICES: LectureVoice[] = [
  {
    id: 'voice-1',
    professorId: 'prof-1',
    title: '연구실 녹음: 문학 텍스트의 심층 독해 가이드',
    duration: '14분 22초',
    transcriptSnippet: '"...문장을 읽을 때 행간의 침묵에 귀를 기울이게. 저자가 차마 쓰지 못한 단어 속에 가장 순수한 진실이 숨어 있으니까. 자네는 이미 그 침묵을 읽을 줄 아는 학자야."',
    keyInsights: [
      '행간 독해의 중요성 및 텍스트 외적 맥락의 유기적 결합',
      '학술 논문 작성 시 감정의 절제와 논증의 명료성 확보 방안'
    ],
    professorReaction: '다시 들어보니 자네와 마주 앉아 이야기하던 그날의 오후가 떠오르는군.',
    timestamp: '2026-08-26 17:45'
  },
  {
    id: 'voice-2',
    professorId: 'prof-4',
    title: '세미나 하이라이트: 법적 논증과 설득의 미학',
    duration: '08분 50초',
    transcriptSnippet: '"...법은 차가운 조문이 아닙니다. 인간에 대한 가장 치열한 애정과 정의가 언어의 갑옷을 입은 것이죠. 자네의 발표는 그 갑옷 속 심장을 보게 해주었네."',
    keyInsights: [
      '설득적 변론의 수사학적 구조화 기법',
      '법적 정의와 개별 사건의 형평성 조율'
    ],
    professorReaction: '자네의 음성이 섞인 이 녹음본은 내게도 각별한 기록일세.',
    timestamp: '2026-08-27 18:30'
  }
];

export const INITIAL_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    professorId: 'prof-1',
    title: '연구실의 황혼',
    subtitle: '이태준 교수와의 늦은 오후 개별 지도',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiKTXSOUe-t6PKt6F-58eBObhqsUt2XSbbEsEtfvQRczhMCqvOkQhZMIAYis9J-YdJZEoalFib2JiF0dTtOkkb6Y49aoHo5XjXC9vnEX3lEUdpniyKRoMTBQzIDmk_NxP0Xml8S9xL-XkehK9HzyFCzNgTUFh_X5WadP-5t5XCA4j2Fuh7N1bB81IdiegQ2GNVeNDVImpQqdQaWWAwWwMdk9TwQU8aoW2eCk5iZYwBEdLFICshN0po',
    unlocked: true,
    unlockCondition: '첫 번째 연구 지도 완료'
  },
  {
    id: 'gal-2',
    professorId: 'prof-2',
    title: '아틀리에의 햇살',
    subtitle: '윤시우 교수와의 조형 연구 세션',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6zs87rBJCVqNXcYYteTmtJj5YmOQ5XyXeQAfTGuBIwIkFU5soaUaJPqSnll8OK0KRvPh486NyFWx1GCUuWltMeKNP7KLdPc4aIdiM8uGOuM5jElGfCIaD6FKKljqPoZv67o6tZFJ0bOhCQpXq2k-FDMTcFoF1sUUZQ9IplAcSZxIGwsaUNpC1UjRja-XNHyI00l7WLFm12MrBCenA0RP6mO6RiB3UXIxtpY-nn0Cpo77C_CxhL9i_',
    unlocked: true,
    unlockCondition: '현대예술 실습 참여'
  },
  {
    id: 'gal-3',
    professorId: 'prof-4',
    title: '고서관의 서약',
    subtitle: '강지혁 교수와의 학술 세미나 발제',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKTF9IFICAKAqfPbSoZ35rKaZIonFA_1as5ltp3F7nfZ0gueYOV_QA2MuQ7a2F_r9snTotg1p8Q3Z67czK2kehdCGjoEaikcUxU0NtaJfTv_LqyLO8jKs7knn5QIR4GSgQMgWESk-ObBHVfxyuR-xEM8Oxp1v05Z8c9D3i_XgiPub_DYtr13vF29HkBIm1lbfoPqOxz1zySGUxm93gHxVibonLy-8UPr8vVGxB_I61QBecO7u3UOvK',
    unlocked: true,
    unlockCondition: '과제 첨삭 A+ 달성'
  }
];
