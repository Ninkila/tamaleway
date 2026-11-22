using UnrealBuildTool;
using System.Collections.Generic;

public class Tamale3DEditorTarget : TargetRules
{
    public Tamale3DEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
        ExtraModuleNames.Add("Tamale3D");
    }
}
