import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
    body {
        background-color: ${({ theme }) => theme.colors.background.main};
        color: ${({ theme }) => theme.colors.neutral.c100};
    }

    *, *:before, *:after {
        box-sizing: border-box;
    }

    &::-webkit-scrollbar {
		width: 6px;
		height: 6px;
		background-color:${({ theme }) => theme.colors.background.main};
	}
	&::-webkit-scrollbar-button {
		opacity: 0;
		height: 0;
		width: 0;
	}
	&::-webkit-scrollbar-track {
		background-color: ${({ theme }) => theme.colors.background.main};
	}
	&::-webkit-scrollbar-thumb {
		background-color: ${({ theme }) => theme.colors.neutral.c50};
		border: 1px solid ${({ theme }) => theme.colors.neutral.c50};
		border-radius: 4px;
	}
	&::-webkit-scrollbar-corner {
		opacity: 0;
	}
  a {
    text-decoration: none;
  }
  a:hover {
    cursor:pointer;
  }
`;

export default GlobalStyle;
